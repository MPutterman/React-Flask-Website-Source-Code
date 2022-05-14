# TODO:
# * Make sure to properly implement cache dirty-ing
# * Use more uniform naming in this module
# * A few functions in here need some study to understand fully
# * Click a point, and autoselect all ROIs, gives slightly different ROI shapes and positions
#    -- These should be unified so they use the exact same algorithm, and same computational
#    -- basis for finding the final ROI
#
# Resources:
# - Using KMeans and KneeLocator to estimate number of clusters (lanes):
#   https://practicaldatascience.co.uk/machine-learning/how-to-use-knee-point-detection-in-k-means-clustering
#
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
from scipy.cluster.vq import kmeans
from skimage import morphology, filters, transform, measure
import matplotlib
import matplotlib.pyplot as plt
from skimage.measure import label
import PIL
import numpy as np
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler

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
    Cerenkov_ROI -= background

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
    return {'shape': 'ellipse', 'shape_params': {'x': x, 'y': y, 'rx': rx, 'ry': ry, }}

def create_rectangle_ROI(x, y, rx, ry):
    return {'shape': 'rectangle', 'shape_params': {'x': x, 'y': y, 'rx': rx, 'ry': ry, }}


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
    if ROI['shape'] != 'ellipse' and ROI['shape'] != 'rectangle':
        print ("ERROR in compute_ROI_data: undefined ROI shape ({})\n" . format(ROI['shape']))
        print (ROI)
        return None
    (image_rows, image_cols) = image.shape # Image size
    pixels = 0
    signal = 0
    mass_x = 0
    mass_y = 0
    # Iterate through image rows from bottom to top of ROI
    for row in range(max(ROI['shape_params']['y'] - ROI['shape_params']['ry'], 0), \
        min(ROI['shape_params']['y'] + ROI['shape_params']['ry'], image_rows-1)):

        # Iterate through image columns from left to right of ROI
        for col in range(max(ROI['shape_params']['x'] - ROI['shape_params']['rx'], 0), \
            min(ROI['shape_params']['x'] + ROI['shape_params']['rx'], image_cols-1)):

            # Determine if point is actually inside ROI
            # For rectangle, all points of the iterated range are within the ROI.
            # For ellipse, we use the ellipse formula to determine which points are inside.
            if (ROI['shape'] == 'rectangle') or ((ROI['shape'] == 'ellipse') and \
               ((row - ROI['shape_params']['y'])**2 / ROI['shape_params']['ry']**2 + \
                (col - ROI['shape_params']['x'])**2 / ROI['shape_params']['rx']**2 < 1.0)):

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

# Compute ROI and lane data based on image
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
def analysis_roi_create_from_point(analysis_id, x, y, shift, shape='ellipse'):
    from filestorage import analysis_radii_path
    img = np.load(analysis_radii_path(analysis_id))

    # TODO: may need different algorithm for different shape ROI
    results = findRadius(img,x,y,shift)
    col = results['col']
    row = results['row']
    colRadius=results['colRadius']
    rowRadius=results['rowRadius']

    if (shape == 'ellipse'):
        return create_ellipse_ROI(col, row, colRadius, rowRadius)
    elif (shape == 'rectangle'):
        return create_rectangle_ROI(col, row, colRadius, rowRadius)

# Finds size of ellipse ROI from a starting point
# TODO: figure out how this works in detail
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

# Finds the bounding box for ROI starting with a point
# TODO: Figure out in detail how this works
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
def analysis_rois_find(analysis_id, shape='ellipse'):
    # Retrieve files needed for analysis
    # TODO: check if they exist? and generate if not?
    from filestorage import analysis_compute_path, analysis_radii_path
    img = np.load(analysis_compute_path(analysis_id))
    imgR = np.load(analysis_radii_path(analysis_id))

    # Find ROI centers
    points = findCenters(img)
    # Find ROIs based on centers
    # TODO: Code used to use points[i][0] and points[i][1] as y and x values, respectively
    #  rather than the updated center returned by findRadius
    roi_list = []
    for i in range(len(points)):
        roi = findRadius(img,points[i][1],points[i][0],1)
        if shape == 'ellipse':
            roi_list.append(create_ellipse_ROI(roi['col'], roi['row'], roi['colRadius'], roi['rowRadius']))
        elif shape == 'rectangle':
            roi_list.append(create_rectangle_ROI(roi['col'], roi['row'], roi['colRadius'], roi['rowRadius']))
    return roi_list

# Create lanes from origins. Assumes two highest further points are for
# defining the solvent front.  Mutates origins.  Returns a lane_list.
def analysis_lanes_from_origins(roi_list, origins):
    # Separate solvent front points from origins
    # - First sort in Y direction (lowest Y at beginning)
    origins.sort(reverse=False, key=lambda origin: origin[0]) #Y-coord (row)
    # - Remove first 2 points (assumed to be solvent front)
    origins_only = origins[2:]
    # Sort origins from left to right
    origins_only.sort(reverse=False, key=lambda origin: origin[1]) #X-coord (col)
    # Generate new origins list (by re-appending solvent front definition)
    origins = [origins[0]] + [origins[1]] + origins_only
    # Generate formatted lane_list
    lane_list = []
    solvent_front_y = (origins[0][0] + origins[1][0]) / 2
    for origin in origins_only:
        lane_list.append(create_tlc_lane (origin[1], origin[0], origin[1], solvent_front_y))
    return lane_list 

# Predict the location of TLC lanes (vertical) by performing KMeans clustering
# of ROIs for the selected number of lanes. 
# TODO: Is there a minimum number of lanes or ROIs needed?
# TODO: should we use the 'labels' method to also capture which ROIs are in each cluster to avoid reassigning later?
def analysis_lanes_find(roi_list, num_lanes=0, origins=[]):

    if num_lanes == 0:
        return []

    if num_lanes > len(roi_list):
        return None

    # Assemble list of x-values of ROIs
    x_rois = [] 
    for roi in roi_list:
        x_rois.append(roi['shape_params']['x']) 

    # Convert to nx1 array
    x_rois = np.asarray([x_rois]).reshape(-1,1)
    # Perform clustering
    x_lanes = KMeans(n_clusters=num_lanes).fit(x_rois).cluster_centers_
    x_lanes = x_lanes.reshape(1,-1)[0].tolist()
    # Sort lanes left to right
    x_lanes.sort()
    # Generate formatted lane_list
    lane_list = []
    for x in x_lanes:
        lane_list.append(create_tlc_lane (x, None, None, None))
    return lane_list 

# Assign ROIs to lanes based on proximity of x-coordinate. Sorts ROIs
# by increasing Y-value (i.e. top to bottom) for results reporting.
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
        closest_lane = np.argsort(lane_x_copy).tolist()[0]
        lane_list[closest_lane]['roi_list'].append({'roi_id': roi_index, })
        roi_index += 1
    # Sort ROIs top to bottom
    for lane in lane_list:
        # Sort lane.roi_list in order of the Y-coordinate. Define a lambda function
        # to return the Y coordinate of the particular ROI
        lane['roi_list'].sort(reverse=False, key=lambda roi: roi_list[roi['roi_id']]['shape_params']['y'])

    return None

# Find centers of potential ROIs
# TODO: How does this work?  Why these steps? Why these particular values?
def findCenters(img):        
    img-= morphology.area_opening(img,area_threshold=3500)
    img = morphology.opening(img,morphology.rectangle(19,1))
    img = morphology.opening(img,morphology.rectangle(1,17))
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
    #centers = find_RL_UD_multiple(img,centers)

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

# Predict the number of lanes from the ROIs (x-coordinates)
# TODO: KneeLocator doesn't work well for low numbers of ROIs and for
#   larger numbers of ROIs seems to underestimate number of clusters.
#   For now we return None indicating an error.
def analysis_lanes_autocount(roi_list):
    # Handle small cases manually (KneeLocator requires at least 2 points)
    if len(roi_list) == 0:
        return 0
    if len(roi_list) == 1:
        return 1

    # Bypass the rest until we get it working
    return None

    # Extract X-values from ROIs
    x_rois = [] 
    for roi in roi_list:
        x_rois.append(roi['shape_params']['x']) 
    # Convert to nx1 array
    x_rois = np.asarray([x_rois]).reshape(-1,1)
    # Preprocess prior to KMeans
    log_x_rois = np.log1p(x_rois)
    scaler = StandardScaler()
    scaler.fit(log_x_rois)
    x_rois = scaler.transform(log_x_rois)
    # Remove duplicates
    x_rois = np.unique(x_rois, axis=0)
    # Perform Kmeans with number of clusters up to number of unique x-coordinates
    errors = {}
    for i in range(len(x_rois)):
        errors[i+1] = KMeans(n_clusters=i+1, random_state=1).fit(x_rois).inertia_
    # Use Kneedle algorithm to find optimal number of clusters (i.e. lanes)
    from kneed import KneeLocator
    elbow = KneeLocator(x=list(errors.keys()), y=list(errors.values()), curve='convex', direction='decreasing').elbow
    return elbow

# Perform background correction of image (acts on 'compute' and 'display' radio
# images but not the 'radii' image.)
# TODO: Figure out what this does in detail
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
