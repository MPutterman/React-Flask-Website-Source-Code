
# TODO:
# * Consider whether the object with constructor is needed, or whether this should be a set of
#   static methods...
# * There seem to be some backed in assumptions that are not clear. E.g. origins is only
#   origins in some cases, but has 2 extra points for doRF... Needs to be documented (and maybe changed)

import time
from scipy.cluster.vq import vq, kmeans,whiten
from skimage import io, morphology, filters,transform, segmentation,exposure
from skimage.util import invert
import scipy
from kneed import KneeLocator
from matplotlib import pyplot as plt
from matplotlib import use,gridspec
from skimage.measure import label
from matplotlib.patches import Rectangle
from matplotlib.widgets import RectangleSelector, Button, EllipseSelector
import matplotlib.patches as pat
from matplotlib import interactive
import matplotlib
import numpy as np
from sklearn.cluster import MeanShift,estimate_bandwidth,AffinityPropagation,KMeans
from skimage.color import rgba2rgb
from skimage import measure

class Analysis():
    """Input: ROIs, n_l, origins, analysi_id, doUV, doRF, autoLane"""
    def __init__(self,ROIs,n_l,origins,analysis_id,doUV,doRF,autoLane,name='',description=''):
        self.doRF=doRF
        self.ROIs = ROIs
        self.n_l=n_l
        self.origins=origins
        self.analysis_id=analysis_id
        self.doRF=doRF
        self.autoLane=autoLane
        self.doUV=doUV
        self.name = name
        self.description = description
    def upload_data(self):
        name = ''
    def __str__(self):
        return (f'ROIS: {self.ROIs} \n origins: {self.origins} \n n_l: {self.n_l} \n analysis_id: {self.analysis_id} \n doUV: {self.doUV} \n doRF,{self.doRF} \n autoLane: {self.autoLane}')
    @staticmethod
    def build_analysis(attributes):
        return Analysis(attributes[0],attributes[1],attributes[2],attributes[3],attributes[4],attributes[5],attributes[6],attributes[7])
    @staticmethod
    def flatten(ROIs):
        newROIs = []
        for i in range(len(ROIs)):
            for j in range(len(ROIs[i])):
                newROIs.append(ROIs[i][j])
        return newROIs

    def dump(self):
        return [self.ROIs,self.n_l,self.origins,self.analysis_id,self.doUV,self.doRF,self.autoLane]
    def setOrigins(self,origins):
        self.origins=origins
    def setROIs(self,ROIs):
        self.ROIs=ROIs
    def setAutoLane(self,autoLane):
        self.autoLane=autoLane
    def setDoRF(self,doRF):
        self.doRF = doRF
    def setN_l(self,n_l):
        self.n_l=n_l
    def setName(self,name):
        self.name=name
    def setDescription(self,description):
        self.description=description

    def results(self, img):
        analysis_id=self.analysis_id
        tim = time.time() 
        newOrigins = (np.asarray(self.origins).copy()).tolist()
        newROIs = (np.asarray(self.ROIs).copy()).tolist()
        #print(newROIs)
        if self.autoLane:
            num_lanes=self.n_l
        autoLane=self.autoLane
        doRF=self.doRF
        doUV=self.doUV
        ##print(request.form['autoLane'])
        ##print(request.form['autoLane']=='true' and (not doRF and not doUV))
        ##print(autoLane)

        cerenks = self.calculateCerenkov(newROIs,img)

        if doUV:
            
            #print(newOrigins)
            RFs = self.calculateRF(newROIs,img)
            cerenks_RFs=[]
            for i in range(len(cerenks)):
                lane = []
                for j in range(len(cerenks[i])):
                    lane.append([cerenks[i][j][4],RFs[i][j][2]])
                cerenks_RFs.append(lane)
            self.makeUniform(cerenks_RFs)
            ##print(list(zip(cerenks_RFs)))
            cerenks_RFs = self.transpose(cerenks_RFs,doUV,doRF,newROIs)
            ####print(cerenks_RFs)
            ####print(time.time()-tim)
            return cerenks_RFs
        elif doRF and not doUV:
            RFs = self.calculateRF(newROIs,newOrigins,img)
            cerenks_RFs=[]
            for i in range(len(cerenks)):
                lane = []
                for j in range(len(cerenks[i])):
                    lane.append([cerenks[i][j][4],RFs[i][j][2]])
                cerenks_RFs.append(lane)
            self.makeUniform(cerenks_RFs)
            ####print(cerenks_RFs)
            ##print(list(zip(cerenks_RFs)))
            cerenks_RFs = self.transpose(cerenks_RFs,doUV,doRF,newROIs)
            ####print(time.time()-tim)
            return cerenks_RFs
            
        else:
            
            cerenk_answers = []

            for i in range(len(cerenks)):
                lane = []
                for j in range(len(cerenks[i])):
                    lane.append([cerenks[i][j][4]])
                cerenk_answers.append(lane)
            nparr = np.asarray(cerenk_answers)
            self.makeUniform(cerenk_answers,doRF=False)
            
            ####print(cerenk_answers)
            ##print(list(zip(cerenk_answers)))
            cerenk_answers = self.transpose(cerenk_answers,doUV,doRF,newROIs)
            ##print(type(cerenk_answers))
            return cerenk_answers
    def predict_ROIs(self,img,imgR):
        self.ROIs=  self.ROIs_from_points(self.findCenters(img),imgR)
        return self.ROIs
    def ROIs_from_points(self,points,img):
    
        arr = []
        for i in range(len(points)):
            res = self.findRadius(img,points[i][1],points[i][0],1)
        
            arr.append([points[i][0],points[i][1],res['rowRadius'],res['colRadius']])
        return arr
    
    @staticmethod
    def find_RL_UD(img,centers):
        arr = []
        for center in centers:

            x,y=center[1],center[0]
            tim = time.time()
            
            LR = 0
            RR=0
            UR=0
            DR=0
            num_zeros = 0

            row = int(y)
            col = int(x)
            val = 2.1*np.mean(img)
            max_zeros = 10
            
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
                    
                    if img[row-DR][col+1]<=val:
                        num_zeros+=1
                DR+=1
            arr.append((round(center[0]+(UR-DR)/2),round(center[1]+(RR-LR)/2)))
        ###print(arr)
        return arr
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
        tim = time.time()
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
    def computeXY_circle(self,img,rowMin,rowMax,colMin,colMax,multiply_place=True):
        colRadiusSquared = ((colMax-colMin)/2)**2
        rowRadiusSquared = ((rowMax-rowMin)/2)**2
        rowCent = (rowMax+rowMin)/2
        colCent = (colMax+colMin)/2
        rowTotal = 0
        colTotal = 0
        pixelCount = 0
        
        for row in range(int(.9*int(min(rowMin,rowMax))),int(max(rowMin,rowMax)+.1*(len(img)-max(rowMin,rowMax)))):
            for col in range(int(.9*int(min(colMin,colMax))),int(max(colMin,colMax)+.1*(len(img[0])-max(colMin,colMax)))):
                if ((row-rowCent)**2)/(rowRadiusSquared)+(((col-colCent)**2)/colRadiusSquared)<=1.05:
                    if multiply_place:
                        rowTotal += row*img[row][col]
                        colTotal += col*img[row][col]
                    else:
                        rowTotal+=img[row][col]
                        colTotal+=img[row][col]
                    pixelCount +=img[row][col]

        if not multiply_place:
            pixelCount = 1
        return(rowTotal/pixelCount,colTotal/pixelCount)
    def clear_near(self,centers):
        i = 0
        j = 0
        c = len(centers)

        while i<c:
            while j<c:
                
                if j!=i:   
                
                    if np.sqrt((centers[i][0]-centers[j][0])**2+(centers[i][1]-centers[j][1])**2)<20:
                        centers.pop(j)
                        c-=1
                        j-=1
                        i-=1
                j+=1        
            i+=1
                
        return centers
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
    def makeTruePoints(self,ROIs,img):
        ROIs_to_fill=[]
        for lane in range(len(ROIs)):
            lane_to_fill=[]
            for spot in range(len(ROIs[lane])):
                spot_to_fill=[]
                rowRad,colRad = ROIs[lane][spot][2],ROIs[lane][spot][3]
                yAv,xAv = self.computeXY_circle(img,ROIs[lane][spot][0]-rowRad,ROIs[lane][spot][0]+rowRad,ROIs[lane][spot][1]-colRad,ROIs[lane][spot][1]+rowRad)
                spot_to_fill=[yAv,xAv,ROIs[lane][spot][2],ROIs[lane][spot][3]]
                lane_to_fill.append(spot_to_fill)
            ROIs_to_fill.append(lane_to_fill)
        return ROIs_to_fill
    def predictLanes(self,ROIs,lanes):
        tim = time.time()
        xs = []
        for i in range(len(ROIs)):
            xs.append(ROIs[i][1])
        xs = np.asarray([xs])
        xs = xs.T
        thresh = KMeans(n_clusters=lanes).fit(xs).cluster_centers_
        np.sort(thresh)
        ###print(time.time()-tim)
        thresh =thresh.tolist()
        for i in thresh:
            i.insert(0,1)
        ###print(thresh)
        
        return thresh   
    def findClosest(self,arr1,arr2):
        theArr = []
        ar1 = np.asarray(arr1)
        ar2 = np.asarray(arr2)
        ar2_copy = ar2.copy()
        for i in range(len(ar1)):
            ar2 = ar2_copy.copy()
            ar2 -= ar1[i]
            ar2 = abs(ar2)
            theArr.append(np.argsort(ar2)[0])
        return theArr
    def findCenters(self,img):
        u = time.time()
        
        img-= morphology.area_opening(img,area_threshold=3500)
        ##print(time.time()-u)
        img = morphology.opening(img,morphology.rectangle(19,1))
        img=morphology.opening(img,morphology.rectangle(1,17))
        u=time.time()
        tim =time.time()
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
        ####print(time.time()-u)
        ##print(time.time()-u)
        for i in range(4):
            centers = Analysis.find_RL_UD(img,centers)
        centers = self.clear_near(centers)
        return centers
    def findMaxLength(self,arr):
        lens = []
        for i in arr:
            lens.append(len(i))
        lens.sort()
        return lens[-1]
    def organize_into_lanes(self):
        
        newArr = self.ROIs

        # Bail if no ROIs
        if len(newArr) == 0:
            return
       
        if self.autoLane:
            thresh = np.asarray(self.predictLanes(newArr,self.n_l))[:,1].tolist()
        elif self.doRF:
            thresh = np.asarray(self.origins[:-2])[:,1].tolist()
            print('origins[:-2]',thresh)
            
        else:
            print('hi',self.origins)
            thresh = np.asarray(self.origins)[:,1].copy().tolist()
        
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
    def calculateCerenkov(self,final_arr,img):
        #print(final_arr)
        for lane in range(len(final_arr)):   
            total_totals = 0
            for spot in range(len(final_arr[lane])):
                row_num = final_arr[lane][spot][0]
                col_num = final_arr[lane][spot][1]
                row_rad = final_arr[lane][spot][2]
                col_rad = final_arr[lane][spot][3]
                total = self.computeXY_circle(img,row_num-row_rad,row_num+row_rad,col_num-col_rad,col_num+col_rad,multiply_place = False)[0]
                total_totals+=total
            for spot in range(len(final_arr[lane])):
                row_num = final_arr[lane][spot][0]
                
                col_num = final_arr[lane][spot][1]
                row_rad = final_arr[lane][spot][2]
                col_rad = final_arr[lane][spot][3]
                total = self.computeXY_circle(img,row_num-row_rad,row_num+row_rad,col_num-col_rad,col_num+col_rad,multiply_place = False)[0]
                final_arr[lane][spot] = (row_num,col_num,row_rad,col_rad,total/total_totals)
        return final_arr
    def findDistance(self,col1,row1,col2,row2):
        return(((col2-col1)**2+(row2-row1)**2)**.5)
    def makeUniform(self,arr,doRF = True):
        max_len = self.findMaxLength(arr)
        for i in arr:
            if len(i)<max_len:
                
                while len(i)<max_len:
                    if doRF:
                        i.insert(-1,["NA","NA"])
                    else:
                        i.insert(-1,["NA"])
    #####print(arr)
    def transpose(self,arr,doRF,doUV,ROIs):
        if doRF or doUV:
            num=2
        else:
            num=1
        for i in arr:
            i.reverse()
        answers = np.asarray(arr)
        arr2=[]
        arr2 = [[0 for x in range(len(answers))] for y in range(len(answers[0]))]
        for i in range(len(arr2)):
            for j in range(len(arr2[0])):
                arr2[i][j]=list(answers[j][i])
        arr2.reverse()
        return arr2
    def findRadius(self,img,x,y,shift):
    
        tim = time.time()
        rowRadius = 0
        colRadius = 0
        num_zeros = 0

        row = int(y)
        col = int(x)
        #print(shift)
        if (shift=='0'):
            for i in range(3):
                center  = Analysis.find_RL_UD(img,[(row,col)])
                row = center[0][0]
                col=center[0][1]
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
        return{"col":col,"row":row,"colRadius":colRadius,"rowRadius":rowRadius}
    def calculateRF(self,ROIs_untrue,origins,img):
        ROIs = self.makeTruePoints(ROIs_untrue,img)
        
        p1,p2 = origins[-2],origins[-1]
        print('1,2',p1,p2)
        if p2[0]-p1[0]!=0:
            SlopeInvTop = (p2[1]-p1[1])/(p2[0]-p1[0])
        else:
            SlopeInvTop=5000
        rowT = int(p1[0]-(p1[1]//SlopeInvTop))
        #print('rowT',rowT)
        print('ROIs',ROIs)
        print('orig',origins)
        #print('p3',ROIs)
        for lane in range(len(ROIs)):
            for spot in range(len(ROIs[lane])):
                point_row,point_col = ROIs[lane][spot][0],ROIs[lane][spot][1]
                origin_row,origin_col = origins[lane][0],origins[lane][1]
                #print('pr,pc,or,oc',point_row,point_col,origin_row,origin_col)
                if point_col-origin_col!=0:

                    SlopeOfLine = (((point_row)-(origin_row))/(point_col-origin_col))
                else:
                    SlopeOfLine = 1000
                SlopeOfOtherLine = 1/SlopeInvTop
                intercept = point_row-(point_col*SlopeOfLine)
                intercept_other = rowT
                finalSlope = SlopeOfLine-SlopeOfOtherLine
                finalIntercept = intercept_other-intercept
                theCol = int(finalIntercept/finalSlope)
                theRow = int(SlopeOfOtherLine*theCol+intercept_other)
                dist = self.findDistance(theCol,theRow,origin_col,origin_row)
                partialDistance = self.findDistance(point_col,point_row,origin_col,origin_row)
                RF = partialDistance/dist
                ROIs[lane][spot]=(ROIs[lane][spot][0],ROIs[lane][spot][1],round(RF,2))
        return ROIs