# TODO:
# * Clean up autolane, n_l, doRF, etc.... - Most are now eliminated
# * Rename doRF to show_Rf
# ---- Add a user-preference whether to show RF values by default 
# ---- Add a show_roi_id checkbox (visual effect only for the results table, but store setting in database)
# * Do we want to show ROI id and Rf values on the image?

# -- If lanes are defined (e.g. via origins), populate num_lanes from definitions
# -- If lanes are not defined, have box to select number of lanes and button button to assign ROIs to lanes
# -- Add a way to assign ROI to a lane (or remove from a lane)? Or only allow ROIs within the boundaries of the lane as drawn?
# -- If add a bunch of ROIs (and not assigned to lane), should we have a button "auto assign all unassigned ROIs"?
# ----- Right now build ROI automatically re-runs autolane. But maybe don't do this until 'submit roi info'
#       button is pushed.  But we could somehow indicate that num_lanes is not accurate.??
#  TODO: FIGURE OUT THIS INTERFACE MORE CLEARLY BEFORE TRYING TO WRITE IT :)
#  TODO: add an 'analysis type / template', e.g. TLC, chips, etc... and apply auto ROI select
#     and auto-lane in a consistent manner with that
#  TODO: calculate 'pseudo-Rf' values if no origins are given?
#
# * Make sure to properly implement cache dirty-ing
# * Add some support for user to draw lanes? Or load a lane-template (e.g. 4 chips or
# *  8 lanes) and then tweak positions?
# * Consider whether the object with constructor is needed, or whether this should be a set of
#   static methods...
# * There are several edge cases leading to errors, e.g. empty ROI list, etc.  Also there are some
#     baked in assumptions that are not clear. What is the structure of origins?  Why does num_lanes
#     change to 10 when I have 8 lanes and add two extra origins for solvent front...?
# * Move the remaining image computations from api.py to here
# * Need to prevent ROI overlap (both for auto-generated or user-generated)

# NOTE: The analysis aspects make extensive use of caching to improve performance, and
# changes to the image, analysis parameters, ROIs or lanes can cause cached information
# to become dirty and requires re-calculation as follows:
# * Change in any image other than brightfield, or change in image correction parameters:
#   - Regenerate calculation image, display image and radii image
#   - Recompute all ROI signal and center of mass
#   - Recompute care is needed to
# * Change in ROI geometry:
#   - Regenerate the signal and center of mass for that ROI
#   - Regenerate lane data (Rf value for the affected ROI, and signal fraction for all ROIs)
#     for all lanes containing that ROI
# * Change in lane parameters (e.g. origin, solvent-front, ROI list)
#   - Regenerate Rf value for affected ROIs
#   - Regenerate signal fraction for all ROIs in lane

import scipy
from scipy.cluster.vq import kmeans,whiten
from skimage import morphology, filters, transform, measure
import matplotlib
import matplotlib.pyplot as plt
from kneed import KneeLocator
from skimage.measure import label
import PIL
import numpy as np
from sklearn.cluster import KMeans

# Helper function to load a full set of image files associated with an analysis.
# Returns a dictionary of files
# NOTE: The files have different formats currently. In the future, these will be unified.
def analysis_load_image_files(analysis_id):

    from database import db_object_load
    analysis = db_object_load('analysis', analysis_id)
    from filestorage import image_file_upload_path

    # Load radio image
    radio_image_array = None
    if (analysis.radio_image_id is not None):
        radio_image = db_object_load('image', analysis.radio_image_id)
        radio_image_path = image_file_upload_path(radio_image.image_id, radio_image.filename)
        radio_image_array = np.loadtxt(radio_image_path) 

    # Load dark image
    dark_image_array = None
    if (analysis.dark_image_id is not None):
        dark_image = db_object_load('image', analysis.dark_image_id)
        dark_image_path = image_file_upload_path(dark_image.image_id, dark_image.filename)
        dark_image_array = np.asarray(PIL.Image.open(dark_image_path))

    # Load flat image
    flat_image_array = None
    if (analysis.flat_image_id is not None):
        flat_image = db_object_load('image', analysis.flat_image_id)
        flat_image_path = image_file_upload_path(flat_image.image_id, flat_image.filename)
        flat_image_array = np.asarray(PIL.Image.open(flat_image_path))

    # Load bright image
    bright_image_array = None
    if (analysis.bright_image_id is not None):
        bright_image = db_object_load('image', analysis.bright_image_id)
        bright_image_path = image_file_upload_path(bright_image.image_id, bright_image.filename)
        bright_image_array = np.loadtxt(bright_image_path)

    # Load uv image
    uv_image_array = None
    if (analysis.uv_image_id is not None):
        uv_image = db_object_load('image', analysis.uv_image_id)
        uv_image_path = image_file_upload_path(uv_image.image_id, uv_image.filename)
        uv_image_array = np.loadtext(uv_image_path)

    return {
        'radio': radio_image_array,
        'dark': dark_image_array,
        'flat': flat_image_array,
        'bright': bright_image_array,
        'uv': uv_image_array,
    }

# Helper function to create cached images 
# TODO: make sure we are capture full bpp data received from various image formats (16-bit, not 8-bit)
def analysis_generate_working_images(analysis_id):

    # Retrieve files
    files = analysis_load_image_files(analysis_id)
    Cerenkov = files['radio']
    Dark = files['dark']
    Flat = files['flat']
    Bright = files['bright']
    UV = files['uv']

    if (Bright is None):
        Bright = UV

    # Apply image corrections and transformations
    # TODO: need to actually look at the analysis parameters (i.e. corrections to apply)
    # TODO: maybe allow user to apply a rotation to whole set of images????

    # Computed the corrected radio image
    if (Dark is not None): # if correct_dark
        Cerenkov = Cerenkov-Dark
    if (Flat is not None): # if correct_flat
        Cerenkov = Cerenkov/Flat
    # if correct_filter (also TODO: choose algorithm)
    Cerenkov = filters.median(Cerenkov)  # TODO: what is the default size here?
    Cerenkov = transform.rotate(Cerenkov,270)
    
    Cerenkov_ROI = Cerenkov.copy()

    # TODO: this background should be computed before some corrections (e.g. flat)
    # Compute background of this corrected image
    # TODO: what does this 'morphology' do?  Is it better than 'fix background'?
    background = morphology.opening(Cerenkov_ROI,selem=morphology.disk(25))
    #mean = np.mean(background)  # Doesn't appear to be used anywhere
    Cerenkov_ROI -= background.copy()

    # This is a crude background subtraction. CAREFUL!!!! only works if > half image
    # has background intensity. TODO: any way to make a more robust/general method?
    Cerenkov-=np.median(Cerenkov)
    Cerenkov_ROI-=np.median(Cerenkov_ROI)

    # Save the radio image for doing calculations... ('compute'/'calc')
    from filestorage import analysis_compute_path, save_array
    save_array(Cerenkov, analysis_compute_path(analysis_id))

    # Save the radio image for finding ROIs... ('radii')
    from filestorage import analysis_radii_path, save_array
    save_array(Cerenkov_ROI, analysis_radii_path(analysis_id))

    # Generate display image (radiation)
    Display_Radio = Cerenkov.copy()
    # Rescale to use full range 0 to 1
    Display_Radio -= np.min(Display_Radio)
    Display_Radio /= np.max(Display_Radio)
    # Apply colormap and convert to format for saving
    Display_Radio = PIL.Image.fromarray((np.uint8(plt.get_cmap('hot')(Display_Radio)*255)))
    from filestorage import analysis_display_radio_path, save_file
    save_file(Display_Radio, analysis_display_radio_path(analysis_id))

    # Create display image (brightfield)
    if Bright is not None:
        if (Flat is not None): # TODO: only if correct_flat
            Bright /= Flat
        Bright = transform.rotate(Bright,270)
        # Rescale to use full range 0 to 1
        Bright -= np.min(Bright) 
        Bright /= np.max(Bright)
        # Convert to format for saving
        Bright = PIL.Image.fromarray((np.uint8(Bright*255)))
        from filestorage import analysis_display_bright_path, save_file
        save_file(Bright, analysis_display_bright_path(analysis_id))

    # Update in database where the display image is, and when cache was updated

    from database import db_analysis_image_cache
    db_analysis_image_cache(
        analysis_id,
        f"/api/file/analysis/display-radio/{analysis_id}",
        f"/api/file/analysis/display-bright/{analysis_id}" if Bright is not None else None
    )

    return True

def create_ellipse_ROI(x, y, rx, ry):
    ROI = {
        'shape': 'ellipse',
        'shape_params': {
            'x': x,
            'y': y,
            'rx': rx,
            'ry': ry,
        }
    }
    return ROI

# 'roi_list' is a list of dict, each with roi_id, signal_fraction, Rf
def create_tlc_lane (origin_x, origin_y, solvent_x, solvent_y):
    lane = {
        'lane_type': 'tlc', ## TODO: other types might be rectangle (i.e. a 'group' more than a lane)
        'lane_params': {
            'origin_x': origin_x,
            'origin_y': origin_y,
            'solvent_x': solvent_x,
            'solvent_y': solvent_y,
        },
        'roi_list': [],
    }
    return lane
        
# Computes parameters for an ROI, i.e. integrated signal for band percentages in a lane,
# and center of 'mass' (e.g. for RF value calculations).
# Should be called when an ROI is created, when geometry changes, or when image/analysis changes.
# NOTE: Mutates ROI in place.
def compute_ROI_data(ROI, image):
    if ROI['shape'] != 'ellipse':
        print ("ERROR in compute_ROI_data: undefined ROI shape ({})\n" . format(ROI['shape']))
        print (ROI)
        return None
    (image_rows, image_cols) = image.shape # Image size
    pixels = 0
    signal = 0
    mass_x = 0
    mass_y = 0
    # Iterate through image rows from bottom to top of ellipse
    for row in range(max(ROI['shape_params']['y'] - ROI['shape_params']['ry'], 0), \
        min(ROI['shape_params']['y'] + ROI['shape_params']['ry'], image_rows-1)):

        # Iterate through image columns from left to right of ellipse
        for col in range(max(ROI['shape_params']['x'] - ROI['shape_params']['rx'], 0), \
            min(ROI['shape_params']['x'] + ROI['shape_params']['rx'], image_cols-1)):

            # Determine if point is actually inside ellipse
            if (row - ROI['shape_params']['y'])**2 / ROI['shape_params']['ry']**2 + \
                (col - ROI['shape_params']['x'])**2 / ROI['shape_params']['rx']**2 < 1.0:

                pixels += 1
                signal += image[row][col]  # add the pixel
                mass_x += col * image[row][col]  # add the pixel, weighted by y
                mass_y += row * image[row][col]  # add the pixel, weighted by x

    ROI['signal'] = signal
    ROI['num_pixels'] = pixels
    ROI['com_x'] = mass_x / signal
    ROI['com_y'] = mass_y / signal

    return None

# Computes parameters for a lane, i.e. fraction of total signal in each ROI, and RF value
# for each ROI if origin and solvent front are defined.
# Should be called when a lane is created, when roi_list changes, or when origin or solvent front are changed
# NOTE: Mutates lane in place. Does not mutate ROIs
# TODO: in the future this may be computed in front-end. Adding here temporarily
def compute_lane_data(lane, all_ROIs):
    # Calculate total signal of ROIs in the lane
    total_signal = 0
    for roi_info in lane['roi_list']:
        total_signal += all_ROIs[roi_info['roi_id']]['signal']
    # Compute fractional signal for each ROI and RF value if possible
    params = lane.get('lane_params') or {}
    origin_x = params.get('origin_x')
    origin_y = params.get('origin_y')
    solvent_x = params.get('solvent_x')
    solvent_y = params.get('solvent_y')
    for roi_info in lane['roi_list']:
        roi_info['signal_fraction'] = all_ROIs[roi_info['roi_id']]['signal'] / total_signal
        # Lazy calculation of Rf (assumes lane is vertical)
        # TODO: In future, extend line from origin to solvent front, find intersection of normal
        # with the center of mass of the ROI.
        if lane.get('lane_type') == 'tlc' and origin_y is not None and solvent_y is not None:
            roi_info['Rf'] = (all_ROIs[roi_info['roi_id']]['com_y'] - origin_y) / (solvent_y - origin_y)
    return None

# Compute roi and lane data based on image
def analysis_compute(analysis_id, roi_list, lane_list):
    # Load relevant image for computations
    from filestorage import analysis_compute_path
    img = np.load(analysis_compute_path(analysis_id))
    for roi in roi_list:
        compute_ROI_data(roi, img) # Mutates in place
    for lane in lane_list:
        compute_lane_data(lane, roi_list) # Mutates in place
    return {
        'roi_list': roi_list,
        'lane_list': lane_list,
    }

# Build an ROI from a click on a point
def analysis_roi_create_from_point(analysis_id, x, y, shift)
    from filestorage import analysis_radii_path
    img = np.load(analysis_radii_path(analysis_id))

    results = findRadius(img,x,y,shift)
    col = results['col']
    row = results['row']
    colRadius=results['colRadius']
    rowRadius=results['rowRadius']

    return create_ellipse_ROI(col, row, colRadius, rowRadius)



# TODO: this function finds the size of an ellipse ROI starting from a point
# TODO: change this so that it loads the image itself...
def findRadius(img,x,y,shift):
    rowRadius = 0
    colRadius = 0
    num_zeros = 0

    row = int(y)
    col = int(x)
    #print(shift)
    if (shift=='0'):
        #for i in range(3):
            center = find_RL_UD(img,(row,col))
            row = center[0]
            col=center[1]
    # TODO the following seems to be somewhat redundant of what find_RL_UD is already doing...
    # One is finding center and one finding radius afterwards?  Can we combine these?
    val =1.35*(np.mean(img[:,150:len(img[0])-150]))
    max_zeros = 25
    thickness = 8
    while num_zeros<max_zeros and row+rowRadius<len(img) and row-rowRadius>0:
        for i in range(round(-thickness/2),round(thickness/2)):
            if img[(row+rowRadius)][(col+i)] <=val:
                    num_zeros +=1
            if img[row-rowRadius][col+i]<=val:
                num_zeros+=1
        rowRadius+=1
    num_zeros = 0
    while num_zeros<max_zeros and col+colRadius<len(img) and col-colRadius>0:
        for i in range(round(-thickness/2),round(thickness/2)):
            if img[row+i][col+colRadius] <= val:
                num_zeros +=1
            if img[row+i][col-colRadius] <=val:
                num_zeros+=1
        colRadius+=1
    if shift ==('1'):
        rowRadius,colRadius = 0,0
    rowRadius,colRadius = min(max(rowRadius+3,14),55),min(max(colRadius+3,14),55)
    # TODO: change this so it returns an ROI?
    return{"col":col,"row":row,"colRadius":colRadius,"rowRadius":rowRadius}



def find_RL_UD_multiple(img,centers):
    arr = []
    for center in centers:
        arr.append(find_RL_UD(img,center))
    return arr

# TODO: finds the bounding box for ROI starting with a point
def find_RL_UD(img,center):

    x,y=center[1],center[0]
    
    LR = 0
    RR=0
    UR=0
    DR=0
    num_zeros = 0

    row = int(y)
    col = int(x)
    val = 2.1*np.mean(img)  # TODO: is this a threshold?  Is it just growing the ROI in each direction until it falls below threshold?
    max_zeros = 10 # TODO: is this the number of sub-threshold pixels before concluding the end of ROI? Seems to be... but 
        # appears to be looking in a line of -3 to +3 pixels (7 pixels) for each step one pixel step in the desired direction...
    # TODO: what is the significance of 40 and 10 in the routines below?
    
    while num_zeros<max_zeros and LR<40 and col-LR>10:
        for i in range(round(-3),round(3)):
            
            if img[row+i][col-LR]<=val:
                num_zeros+=1
        LR+=1
    num_zeros = 0
    while num_zeros<max_zeros and RR<40 and col+RR<682-10:
        for i in range(round(-3),round(3)):
            
            if img[row+i][col+RR]<=val:
                num_zeros+=1
        RR+=1
    num_zeros = 0
    while num_zeros<max_zeros and UR<40 and row+UR<682-10:
        for i in range(round(-3),round(3)):
            
            if img[row+UR][col+i]<=val:
                num_zeros+=1
        UR+=1
    num_zeros = 0
    while num_zeros<max_zeros and DR<40 and row-DR>10:
        for i in range(round(-3),round(3)):
            
            if img[row-DR][col+i]<=val:
                num_zeros+=1
        DR+=1
    return(round(center[0]+(UR-DR)/2),round(center[1]+(RR-LR)/2))

# Auto-select ROIs from image
def analysis_rois_find(analysis_id):
    # Retrieve files needed for analysis
    # TODO: check if they exist? and generate if not?
    from filestorage import analysis_compute_path, analysis_radii_path
    img = np.load(analysis_compute_path(analysis_id))
    imgR = np.load(analysis_radii_path(analysis_id))
    ROIs = ROIs_from_points(findCenters(img),imgR)
    # Generate new format ROIs:
    roi_list = []
    for ROI in ROIs:
        roi_list.append(create_ellipse_ROI(ROI[1],ROI[0],ROI[3],ROI[2]))
    return {
#        'ROIs': ROIs,
        'roi_list': roi_list,
    }

# Helper function for analysis_rois_autoselect
def ROIs_from_points(points,img):
    arr = []
    for i in range(len(points)):
        res = findRadius(img,points[i][1],points[i][0],1)
        arr.append([points[i][0],points[i][1],res['rowRadius'],res['colRadius']])
    return arr

# Predict the location of TLC lanes (vertical) by performing KMeans clustering
# of ROIs for the selected number of lanes
# TODO: cluster based on center of mass if available?
# TODO: do we want to assign points to lanes also based on what's in clusters?  'Labels' are
#  an array integer values for each input point giving cluster (i.e. lane) number.
#  When do we do sorting?  Before or after?
def analysis_lanes_find(roi_list,num_lanes):
    # Assemble list of x-values of ROIs
    x_rois = [] 
    for roi in roi_list:
        x_rois.append(roi['shape_params']['x']) 

    # Convert to nx1 array
    x_rois = np.asarray([x_rois]).reshape(-1,1)
    # Perform clustering
    x_lanes = KMeans(n_clusters=num_lanes).fit(x_rois).cluster_centers_
    x_lanes = x_lanes.reshape(1,-1)[0].tolist()
    x_lanes.sort() # Sort left to right
    lane_list = []
    for x in x_lanes:
        lane_list.append(create_tlc_lane (x, None, None, None))
    return lane_list 

# Assign ROIs to lanes based on proximity of x-coordinate
# Mutates the lanes, i.e. deletes and updates roi_list for all lanes
# TODO: have a separate routines for group-like lanes (e.g. chips) that
#   are not organized into vertical lanes
def analysis_assign_rois_to_lanes(roi_list, lane_list):
    # Return if no lanes
    if len(lane_list) == 0:
        return None
    # Get x-coordinates of lanes
    lane_x = []
    for lane in lane_list:
        lane_x.append(lane['lane_params']['origin_x'])
        lane['roi_list'] = [] # Clear current ROI list
    # Iterate through ROIs and assign each to the closest lane
    roi_index = 0
    for roi in roi_list:
        lane_x_copy = np.asarray(lane_x.copy())
        # TODO: check if compatible ROI type
        # Compute absolute distance (x) between lanes and the ROI
        lane_x_copy -= roi['shape_params']['x']
        lane_x_copy = abs(lane_x_copy)
        # Pick the lane with smallest distance
        print("in assign_rois_to_lanes: lane_x, distances, and args array")
        print(np.asarray(lane_x))
        print(lane_x_copy)
        print(np.argsort(lane_x_copy))
        print(np.argsort(lane_x_copy).tolist())

        closest_lane = np.argsort(lane_x_copy).tolist()[0]
        lane_list[closest_lane]['roi_list'].append({'roi_id': roi_index, })
        roi_index += 1

    return None
    
# Find centers of potential ROIs
# TODO: How does this work?
def findCenters(img):        
    img-= morphology.area_opening(img,area_threshold=3500)
    img = morphology.opening(img,morphology.rectangle(19,1))
    img=morphology.opening(img,morphology.rectangle(1,17))
    img2 = morphology.h_maxima(img, 5)
    img2 = morphology.dilation(img2,morphology.disk(4))
    
    img2 = label(img2)

    num_things = round(np.max(img2))

    colors_arr = [[] for i in range(num_things)]
    for i in range(len(img2)):
        for j in range(len(img2[i])):
            if round(img2[i][j])!=0:
                colors_arr[round(img2[i][j]-1)].append((i,j))

    centers = []
    for i in range(len(colors_arr)):
        count=0
        totalcol= 0
        totalrow=0
        for j in colors_arr[i]:
            
            totalcol+=j[1]
            totalrow+=j[0]
            count+=1
        totalcol/=count
        totalrow/=count
        centers.append((int(totalrow),int(totalcol)))
    
    # TODO: is this routine just 'recentering' the center after finding bounding box?
    # TODO: why is the bounding box info discarded (and then recalculated later)?
    centers = find_RL_UD_multiple(img,centers)

    # Remove centers that are too close to one another
    i = 0
    j = 0
    c = len(centers)
    min_proximity = 20 # pixels
    while i<c:
        while j<c:
            if j!=i:   
                if np.sqrt((centers[i][0]-centers[j][0])**2+(centers[i][1]-centers[j][1])**2)<min_proximity:
                    centers.pop(j)
                    c-=1
                    j-=1
                    i-=1
            j+=1        
        i+=1
            
    return centers

class AnalysisHelper():
    """Input: ROIs, n_l, origins, doRF, autoLane"""
    def __init__(self,ROIs,n_l,origins,doRF,autoLane):
        self.ROIs = ROIs
        self.n_l=n_l
        self.origins=origins
        self.doRF=doRF
        self.autoLane=autoLane

    def __str__(self):
        return (f'ROIS: {self.ROIs} \n origins: {self.origins} \n n_l: {self.n_l} \n \n doRF,{self.doRF} \n autoLane: {self.autoLane}')

    # TODO: in future, this will not be necessary.
    # The ROI list will always be flat
    @staticmethod
    def flatten(ROIs):
        newROIs = []
        for i in range(len(ROIs)):
            for j in range(len(ROIs[i])):
                newROIs.append(ROIs[i][j])
        return newROIs

    def dump(self):
        return [self.ROIs,self.n_l,self.origins,self.doRF,self.autoLane]

    def results(self, img):
        newOrigins = (np.asarray(self.origins).copy()).tolist() ## TODO: figure out what this is doing
        newROIs = (np.asarray(self.ROIs).copy()).tolist() ## TODO: figure out what this is doing
        #print(newROIs)
        if self.autoLane:
            num_lanes=self.n_l
        autoLane=self.autoLane
        doRF=self.doRF
        ##print(request.form['autoLane'])
        ##print(request.form['autoLane']=='true' and (not doRF and not doUV))
        ##print(autoLane)

        # Create our new style lane and ROI lists to pass to the front end

        all_rois = {} # Dictionary of rois indexed by roi_id
        all_lanes = [] # List of lanes
        roi_count = 0 # Used to generate roi_id
        lane_count = 0 # used to generate lane_id

        solvent_p1, solvent_p2 = newOrigins[-2], newOrigins[-1]

        for old_roi_list in newROIs: # newROIs is array of ROI lists, indexed by lane
            new_roi_list = []
            for roi in old_roi_list:
                new_roi = {
                    'id': roi_count,
                    'shape': 'ellipse',
                    'shape_params': {
                        'x':roi[1],
                        'y':roi[0],
                        'rx':roi[3],
                        'ry':roi[2],
                    },
                }
                compute_ROI_data(new_roi, img)
                all_rois[roi_count] = new_roi
                new_roi_list.append({'roi_id': roi_count,})
                roi_count += 1

            new_lane = {
                'lane_id': lane_count,
                'roi_list': new_roi_list,
                'lane_type': 'tlc',
                'lane_params': {
                    'origin_x': newOrigins[lane_count][1],
                    'origin_y': newOrigins[lane_count][0],
                    'solvent_x': newOrigins[lane_count][1], # Match origin_x
                    'solvent_y': (solvent_p1[0] + solvent_p2[0])/2, # Lazy method -- just taking average of y-coordinate of solvent points; but really should be interpretting at origin_x
                },
            }
            compute_lane_data(new_lane, all_rois)
            all_lanes.append(new_lane)
            lane_count += 1

        return {'roi_list': all_rois, 'lane_list': all_lanes}

    @staticmethod
    def numLanes_finder(ROIs):
        if len(ROIs)<=1:
            return 1
        if len(ROIs)==2:
            if abs(ROIs[0][1]-ROIs[1][1])>25:
                return 2
            else:
                return 1
        print('3',ROIs)
        losses = []
        lanes=[]
        ROIs = np.asarray(ROIs)
        ROIs = ROIs[:,1]*100
        ROIs = np.expand_dims(ROIs,axis=1)
        ROIs = whiten(ROIs)
        start = max(int(len(ROIs)/3-1),1)
        print('start',start)
        print(len(ROIs))
        for j in range(start,len(ROIs)+2):
            if j>len(ROIs):
                lanes.append(j)
                losses.append(2)
            else:
                try:
                    print(j)
                    centers, loss = kmeans(ROIs,j)
                    losses.append(100*loss+2)
                    lanes.append(j)
                except:
                    break
        print(lanes,losses)
        kn = KneeLocator(lanes, losses, curve='convex', direction='decreasing')
        print(kn,kn.knee,kn.elbow)
        return int(kn.knee)

    def sort2(self,points2,index=0):
        """Sorts points2 by simple bubblesort
        Args:
            points2(list)
        Mutates:
            points2(list)
        """
        #print('p2',points2)
        u = points2
        for i in range(len(points2)):
            for j in range(len(points2[i])):
                for k in range(len(points2[i])):
                    if points2[i][j][index]<points2[i][k][index]:
                        
                        
                        a = points2[i][j]
                        points2[i][j]=points2[i][k]
                        points2[i][k] = a 
        return points2


    def findClosest(self,arr1,arr2):
        theArr = []
        ar1 = np.asarray(arr1)
        ar2 = np.asarray(arr2)
        ar2_copy = ar2.copy()
        # TODO: clever approach... both arrays are X-values
        #  sorted in increasing order.  Subtract the first element of first array from all values of the second
        #  array. i.e. the distance to the center of each lane.  The smallest is the closest
        #  how to figure out the lane number?
        #  Repeat for each value
        for i in range(len(ar1)):
            ar2 = ar2_copy.copy()
            ar2 -= ar1[i]
            ar2 = abs(ar2)
            theArr.append(np.argsort(ar2)[0])
        return theArr


'''
    def organize_into_lanes(self, roi_list, lane_list):

        newArr = self.ROIs

        # Bail if no ROIs
        if len(newArr) == 0 or len(roi_list) == 0
            return

        # Get an array of x-coordinates of lanes

        # TODO: figure out what is the distinguishing logic here... 
        if self.autoLane:
            #thresh = np.asarray(analysis_lanes_autoselect(newArr,self.n_l))[:,1].tolist()
            result = analysis_lanes_autoselect(newArr, self.n_l)
            thresh = result['thresh']
            print ('autoselecting....')
        elif self.doRF:
            thresh = np.asarray(self.origins[:-2])[:,1].tolist()
            print('origins[:-2]',thresh)
        else:
            print('hi',self.origins)
            thresh = np.asarray(self.origins)[:,1].copy().tolist()  ## TODO: is this any different than [:-2])[:,1} statement above?
        
        print('thresh',thresh)
        newArr_copy = []
        newArr_copy2 = []
        for i in range(len(newArr)):
            newArr_copy2.append(newArr[i])
            newArr_copy.append(newArr[i][1])
        newArr = newArr_copy
        
        thresh.sort() 
        #print('thresh',thresh)
        #print('points',newArr)
        whatLane = self.findClosest(newArr,thresh)
        #whatLane = orgranize each center into which lane it should be in
        final_arr = [[0]*1 for i in range(len(thresh))]
        #create an array newArr which has lane rows

        for spot in range(len(newArr)):
            #  two thresh = 1 rectangle, which is why its len(thresh)//2
            
            where = whatLane[spot]
            # set where variable equal to whatLane a certain rectangle should be in
            
            final_arr[where].append(spot)
            # at that lane, append which rectangle it is

        for l in range(len(final_arr)):
            final_arr[l] = final_arr[l][1:]
            # take away the zero at the beginning of each lane

        for l in range(len(final_arr)):
            for j in range(len(final_arr[l])):
                # for every cell in point2, change it to the corresponding 
                spot = final_arr[l][j]

                final_arr[l][j] = (newArr_copy2[spot])
        
        final_arr = self.sort2(final_arr)
        #print('le points',final_arr)
        self.ROIs = final_arr
        #print(self.ROIs)
        return
'''

# TODO: Figure out what this function does. It does some kind of 
#  correction on the 'compute' and 'display' radio images.
#  Question: Why doesn't the 'radii' image get corrected?
def fix_background(analysis_id):
    from filestorage import analysis_radii_path
    img = np.load(analysis_radii_path(analysis_id))
    val = img.copy()
    img-=np.min(img)
    img+=.001
    ideal_r = 25
    b4=morphology.opening(img,morphology.disk(ideal_r-10))
    b0 = morphology.closing(img,morphology.disk(ideal_r))
    b1 = morphology.opening(img,morphology.disk(ideal_r+5))
    b2 = morphology.opening(img,morphology.disk(ideal_r))
    b3 = morphology.opening(img,morphology.disk(ideal_r-5))
    b = b1.copy()
    c = ideal_r*2
    arr = np.array([[-1*ideal_r,1],[ideal_r-10,1],[0,1],[ideal_r-5,1],[ideal_r,1],[ideal_r+5,1]])
    arr = np.linalg.pinv(arr)
    for i in range(len(b)):
        
        for j in range(len(b[i])):
            if abs(b3[i][j]-b1[i][j])>20:
                arr2=arr @ np.log(np.array([b0[i][j],b4[i][j],img[i][j],b3[i][j], b2[i][j], b1[i][j]]))
                x = arr2[0]
                y=arr2[1]
                b[i][j] = np.exp(y)*np.exp(x*c)
    # TODO: is this to get rid of faint artifacts along edges of chips/plates?
    b=filters.median(b,selem=morphology.rectangle(40,2))
    b=filters.median(b,selem=morphology.rectangle(2,40))
    img-=b
    img-=np.median(img)
    from filestorage import analysis_compute_path, save_array
    save_array(img, analysis_compute_path(analysis_id)) # retrieve_image_path('cerenkovcalc',analysis_id)
    #os.remove(path)
    #np.save(path,img)
    img-=np.min(img)
    img/=np.max(img)   
    ## TODO: these images should be 16-bit... this might be truncating
    ## them...
    img = PIL.Image.fromarray((np.uint8(plt.get_cmap('hot')(img)*255)))
    from filestorage import analysis_display_radio_path, save_file
    save_file(img, analysis_display_radio_path(analysis_id))

    from database import db_analysis_image_cache
    db_analysis_image_cache(analysis_id, f"/api/file/analysis/display-radio/{analysis_id}")
    return None
