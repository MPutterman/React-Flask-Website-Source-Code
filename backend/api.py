
# RESOURCES and CREDITS:
#
# * https://flask.palletsprojects.com/en/1.1.x/api/ (main Flask api documentation)
# * https://flask.palletsprojects.com/en/2.0.x/config/ (how to handle app configuration)
# * https://pythonise.com/series/learning-flask/python-before-after-request (how to use before/after request handlers)
# * https://flask-login.readthedocs.io/en/latest/#flask_login (flask_login documentation)
# * https://pythonhosted.org/Flask-Security/quickstart.html (use of flask_security module) -- not currently used
# * https://yasoob.me/posts/how-to-setup-and-deploy-jwt-auth-using-react-and-flask/ (handling login with react/flask combination)
# * https://www.digitalocean.com/community/tutorials/how-to-add-authentication-to-your-app-with-flask-login (another approach)

# NOTES:
# * Need to import session from Flask, and Session from flask_session


# TODO:
# * We should move all the analysis-specific stuff out of here and into separate files that are just loaded in particular
#   API calls when needed
# * The front end is the main place to restrict access to routes, and display 'not authorized'. Probably we should not use
#   @flask_login.login_required in the backend. Part of this issue is it is not clear how to set up flask_login.login_view
#   to execute a FRONTEND redirect
#   an extra layer of protection in backend using @flask_login.login_required
# * A few sites have recommended using '/api' at the beginning of all backend to help better separate frontend and backend
# * A lot of flask_session files get created per request (for Mike). Does this happen for others too?
# * Need to look up how to split initialization activities between (if __name__ == '__main__':) section and @app.before_first_request
# * Need to prevent saving of empty password to user profile (e.g. when create account from google login, or when update account
#   after Google login)
# * Need to look at difference between DB session versus connection... maybe not using correctly
# * Need to test whether session timeout is working properly, and remember-me feature

import time

from flask import Flask, request,Response,send_file,send_from_directory,make_response,Response,session
from skimage import io, morphology, filters,transform, segmentation,exposure
from skimage.util import invert
import scipy
from matplotlib import pyplot as plt
from matplotlib import use,gridspec
from skimage.measure import label
from matplotlib.patches import Rectangle
from matplotlib.widgets import RectangleSelector, Button, EllipseSelector
import matplotlib.patches as pat
from matplotlib import interactive
from flask_session import Session
import matplotlib
import numpy as np
from PIL import Image
from sklearn.cluster import MeanShift,estimate_bandwidth,AffinityPropagation,KMeans
from skimage.color import rgba2rgb
import os
from skimage import measure
from flask_cors import CORS,cross_origin
import flask_login
from flask_login import LoginManager

import ast
from datetime import timedelta


# Include database layer
from database import (
    db_create_tables, db_add_test_data,db_cleanup,
    db_user_load, db_user_load_by_email,
    retrieve_image_path,retrieve_initial_analysis,db_analysis_save,db_analysis_save_initial,db_analysis_edit
)

class analysis():
    """Input: ROIs, n_l, origins, filename, doUV, doRF, autoLane, names"""
    def __init__(self,ROIs,n_l,origins,filename,doUV,doRF,autoLane,names=['Sample','Sample','Sample','','','',''],name='',description=''):
        self.doRF=doRF
        self.ROIs = ROIs
        self.n_l=n_l
        self.origins=origins
        self.filename=filename
        self.doRF=doRF
        self.autoLane=autoLane
        self.doUV=doUV
        self.names=names
        self.name = name
        self.description = description
    def upload_data(self):
        name = ''
    def __str__(self):
        return (f'ROIS: {self.ROIs} \n origins: {self.origins} \n n_l: {self.n_l} \n filename: {self.filename} \n doUV: {self.doUV} \n doRF,{self.doRF} \n autoLane: {self.autoLane} \n {self.names}')
    @staticmethod
    def build_analysis(attributes):
        return analysis(attributes[0],attributes[1],attributes[2],attributes[3],attributes[4],attributes[5],attributes[6],attributes[7])
    @staticmethod
    def flatten(ROIs):
        newROIs = []
        for i in range(len(ROIs)):
            for j in range(len(ROIs[i])):
                newROIs.append(ROIs[i][j])
        return newROIs

    def dump(self):
        return [self.ROIs,self.n_l,self.origins,self.filename,self.doUV,self.doRF,self.autoLane,self.names]
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

    def results(self):
        filename=self.filename
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
        
        if doUV:
            
            img =session.get('cerenkovcalc')
            #print(newOrigins)
            cerenks= self.calculateCerenkov(newROIs,img)
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
            img = session.get('cerenkovcalc')
            cerenks = self.calculateCerenkov(newROIs,img)
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
            img = session.get('cerenkovcalc')
            
            cerenks = self.calculateCerenkov(newROIs,img)
            
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
            centers = analysis.find_RL_UD(img,centers)
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
                center  = analysis.find_RL_UD(img,[(row,col)])
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

def np64toint(arr):
    for i in range(len(arr)):
        for j in range(len(arr[i])):
            arr[i][j]=int(arr[i][j])
    return arr
def finalize(Dark,Dark2,Flat,Flat2,Cerenkov,Cerenkov2,UV,UV2,UVFlat,UVFlat2,Bright,Bright2,BrightFlat,BrightFlat2):
    ####print('dark')
    Dark = makeFileArray(Dark,Dark2)
    ####print('flat')
    Flat = makeFileArray(Flat,Flat2)
    ####print('cerenkov')
    Cerenkov = makeFileArray(Cerenkov,Cerenkov2)
    ####print('UV')
    UV = makeFileArray(UV,UV2)
    ###print('UVFLAt')
    UVFlat = makeFileArray(UVFlat,UVFlat2)
    ###print('b')
    Bright = makeFileArray(Bright,Bright2)
    ###print('bf')
    BrightFlat = makeFileArray(BrightFlat,BrightFlat2)
    if isStorage(Cerenkov):
        Cerenkov = np.loadtxt('./SampleData/DMSO140-160')
    if isStorage(Dark):
        Dark= Image.open('./SampleData/masterdark.tiff')
        Dark = np.asarray(Dark)
        
    if isStorage(Flat):
        Flat= Image.open('./SampleData/masterflat.tiff')
        Flat = np.asarray(Flat)
    return startUp(Dark,Flat,Cerenkov,UV,UVFlat,Bright,BrightFlat)

def startUp(Dark,Flat,Cerenkov,UV,UVFlat,Bright,BrightFlat):
    
    doUV = True
    
    if int(isStorage(UV))  +int(isStorage(Bright)) ==1:
        if isStorage(UV):
            UV = Bright
            UVFlat = BrightFlat
        else:
            Bright = UV
            BrightFlat = UVFlat
    if (isStorage(UV)) and (isStorage(Bright)):
        doUV = False
        
        
    if doUV:
        if isStorage(UVFlat) and isStorage(BrightFlat):
            UVFlat = np.zeros_like(UV)+1
    
         
    Cerenkov = Cerenkov-Dark
    Cerenkov = Cerenkov/Flat
    Cerenkov = filters.median(Cerenkov)
    Cerenkov = transform.rotate(Cerenkov,270)
     
    C2 = Cerenkov.copy()
    tim = time.time()
    
    
    
    t = time.time()

     
    disk = morphology.disk(25)
    background = morphology.opening(Cerenkov,selem=disk)
    mean = np.mean(background)
    
    C2 = Cerenkov.copy()
    Cerenkov -= background.copy()   
    C2-=np.median(C2)
    ROIs=[]
    
    Cerenkov-=np.median(Cerenkov)
    if doUV:
        Cerenkov_show= Cerenkov.copy()
        Cerenkov_show = Cerenkov_show-np.min(Cerenkov_show)
        Cerenkov_show = Cerenkov_show *1/np.max(Cerenkov_show)
        Cerenkov_show = Image.fromarray((np.uint8(plt.get_cmap('viridis')(Cerenkov_show)*255)))
    if doUV:
        UV/=UVFlat
        UV = transform.rotate(UV,270)
        UV = filters.median(UV)
        UV = (np.max(UV)-UV)
        UV-=np.min(UV)
        UV *= ((np.max(Cerenkov)-np.min(Cerenkov))/(np.max(UV)-np.min(UV)))
        timee = time.time()
        UV -=morphology.opening(UV,morphology.disk(30))
        UV = UV**.65
        UV*=(np.max(Cerenkov))/(np.max(UV))
        UV_show = UV.copy()
    if doUV:
        UV_show= UV.copy()
        UV_show = UV_show-np.min(UV_show)
        UV_show = UV_show *1/np.max(UV_show)
        UV_show = Image.fromarray((np.uint8(plt.get_cmap('viridis')(UV_show)*255)))

    if  not doUV:
        display_img = C2.copy()
    if doUV:
        display_img=UV.copy()+C2.copy()
        display_img_calc = Cerenkov.copy()
    if not doUV:
        return display_img,Cerenkov,doUV,C2,ROIs
    else:
        return display_img,display_img_calc,doUV,Cerenkov_show,UV_show,C2,Cerenkov,ROIs
def isStorage(item):
    return("FileStorage" in str(type(item)))

def is_unique_key(num):
    directory = os.listdir('./UPLOADS/')
    for i in directory:
        if str(num) in i:
            return False
    return True
def generate_key():
    num=1
    while True:
        num = int((10**11)*np.random.rand())
        #print(num)
        num=np.base_repr(num,base=16)
        #print(num)
        if is_unique_key(num):
            break
    return num
    
    
    
    
    
def makeFileArray(fileN,fileN1):
    tim = time.time()
    try:
        fileN1 = np.loadtxt(fileN1)
        fileN = fileN1
        
    except:
        try:
            fileN = Image.open(fileN.stream)
            fileN = np.asarray(fileN)
        except:
            pass
    ####print(time.time()-tim)
    return fileN
def add_dir(email):
    #print('here')
    # TODO: change file structure to
    # /image/<equip_ip>/dark, flat, bright, radiation ??

    os.mkdir(f"./users/{email}")
    os.mkdir(f"./users/{email}/files")
    file = open(f"./users/{email}/files/desc.txt", "w")
    file.close()
    os.mkdir(f"./users/{email}/files/Cerenkov")
    os.mkdir(f"./users/{email}/files/Darkfield")
    os.mkdir(f"./users/{email}/files/Flatfield")
    os.mkdir(f"./users/{email}/files/UV")
    os.mkdir(f"./users/{email}/files/UVFlat")
    os.mkdir(f"./users/{email}/files/Brightfield")
    os.mkdir(f"./users/{email}/files/BrightfieldFlat")

def findName(name,start,end):
    return name[name.index(start)+len(start):name.index(end)]
def findCerenkov(name):
    return findName(name,"c@~","cd@~")
def findDark(name):
    return findName(name,"cd@~","cf@~")
def findFlat(name):
    return findName(name,"cf@~","u@~")
def findUV(name):
    return findName(name,"u@~","uf@~")
def findUVFlat(name):
    return findName(name,"uf@~","l@~")
def findL(name):
    return findName(name,"l@~",".npy")
def findFiles(lanes,cerenkName,darkName,flatName,UVName,UVFlatName):
    list_dir = os.listdir('./database')
    names = []
    
    #print(lanes)
    for i in list_dir:
        arr =[]
        if (cerenkName in findCerenkov(i)) and (darkName in findDark(i)) and (flatName in findFlat(i)) and (UVName in findUV(i)) and (UVFlatName in findUVFlat(i)) and (str(lanes) in findL(i)):
            arr.append(findCerenkov(i))
            arr.append(findDark(i))
            arr.append(findFlat(i))
            arr.append(findUV(i))
            arr.append(findUVFlat(i))
            arr.append(findL(i))
            names.append(arr)
    return names

# Import server configuration info
from dotenv import load_dotenv
load_dotenv()

# App and session setup and configuration
app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('FLASK_APP_SECRET_KEY') # TODO: rename to FLASK_SESSION_SECRET_KEY
app.config['SESSION_TYPE'] = 'filesystem'
app.config['SESSION_PERMANENT'] = True
#app.config['SESSION_COOKIE_HTTPONLY'] = True
#app.config['REMEMBER_COOKIE_HTTPONLY'] = True
#app.config['SESSION_COOKIE_SAMESITE'] = 'Strict'
app.config.from_object(__name__)  # still need this?
Session(app)

CORS(app,
    headers=['Content-Type'],
    expose_headers=['Access-Control-Allow-Origin'],
    support_credentials=True
)

def login_view():
    return "<p>ERROR: backend intercepted request intended only for logged in users. This should be prevented from the front end.</p>"

login_manager = LoginManager(app)
#login_manager.session_protection = 'strong'
login_manager.login_view = 'login_view'
login_manager.login_message = 'You need to be logged in to perform this request.'
#login_manager.unauthorized = .....   ## HOW TO USE THIS?

app.config['session_timeout'] = 10 # minutes
app.permanent_session_lifetime = timedelta(minutes=app.config['session_timeout'])
app.config['anonymous_user_name'] = 'Anonymous'

@login_manager.user_loader
def session_load_user(user_id):
    return db_user_load(user_id)


# ---------------
# Global handlers
# ---------------

@app.before_first_request
def initialize():
    db_create_tables() # won't always do this
    db_add_test_data() # won't always do this

#@app.before_request
#def initialize_request():

@app.teardown_request
def teardown(exception):
    db_cleanup()

# -------------------
# USER-related routes
# -------------------

@app.route('/api/session/load', methods = ['GET'])
@cross_origin(supports_credentials=True)
def session_load():
    user = flask_login.current_user
    if (user.is_authenticated):
        #print("GET /api/session/load, retrieved user_id = " + str(user.user_id) + "\n")
        user_dict = user.as_dict()
        user_dict.pop('password_hash') # Remove password_hash before returning to frontend
        return ({ 'current_user': user_dict })
    else:
        #print("GET /api/session/load, not logged in\n")
        return ({ 'current_user': None })


# TODO: add error checking if not found
@app.route('/user/load/<id>', methods = ['GET'])
@cross_origin(supports_credentials=True)
def user_load(id):
    from database import db_user_load
    user = db_user_load(id)
    data = user.as_dict()
    data['org_list'] = [org.org_id for org in user.org_list]
    return data

# Return a list of users (array of dict)
# TODO: read in parameter strings from request for filtering, pagination, order, etc.
@app.route('/user/search', methods = ['GET', 'POST']) # QUESTION: need GET and POST?
@cross_origin(supports_credentials=True)
def user_search():
    from database import db_user_search
    org_list = db_user_search()
    return org_list

# Save the submitted user information
@app.route('/user/save', methods = ['POST'])
#@flask_login.login_required
@cross_origin(supports_credentials=True)
def user_save():
    #print(request.form)

    data = {
        'user_id': request.form.get('user_id') or None,
        'first_name': request.form.get('first_name'),
        'last_name': request.form.get('last_name'),
        'email': request.form.get('email'),
        'password': request.form.get('password'),
        'org_list': [int(org_id) for org_id in request.form.get('org_list').split(',') if org_id.strip()],
    }
    # TODO: somehow missing value is coming in as text 'null' if missing... maybe from front-end
    if (data['user_id'] == 'null'):
        data['user_id'] = None
    # org_list arrives as a string with commas... need to split to generate an array
    from database import db_user_save
    user = db_user_save(data)
    data['user_id'] = user['user_id']
    return data

# ---------------------------
# ORGANIZATION-related routes
# ---------------------------

# Return a list of organizations (array of dict)
# TODO: read in parameter strings from request for filtering, pagination, order, etc...
@app.route('/organization/search', methods = ['GET'])
@cross_origin(supports_credentials=True)
def organization_search():
    from database import db_organization_search
    org_list = db_organization_search()
    return org_list



@app.route('/get_data',methods = ['POST'])
@cross_origin(supports_credentials=True)
def findData():
    np.load.__defaults__=(None, True, True, 'ASCII')
    np_load_old = np.load
    #print(request.form["files"])

@app.route("/database_retrieve",methods=["POST"])
@cross_origin(supports_credentials=True)
def ret_data():
    return({"files":findFiles(request.form["Lanes"],request.form["Cerenkov"],request.form["Darkfield"],request.form["Flatfield"],request.form["UV"],request.form["UVFlat"])})
@app.route('/fix_background/<num>')
@cross_origin(supports_credentials=True)
def fix_background(num):
    #print('f')
    img = session.get('cerenkovradii')
    tim = time.time()
    val = img.copy()
    img-=np.min(img)
    img+=.001
    ideal_r = 25
    #print(ideal_r)
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
    b=filters.median(b,selem=morphology.rectangle(40,2))
    b=filters.median(b,selem=morphology.rectangle(2,40))
    img-=b
    img-=np.median(img)
    path = retrieve_image_path('cerenkovcalc',num)
    os.remove(path)
    np.save(path,img)
    img-=np.min(img)
    img/=np.max(img)   
    #print(time.time()-tim)
    img = Image.fromarray((np.uint8(plt.get_cmap('viridis')(img)*255)))
    filepath = retrieve_image_path('cerenkovdisplay',num)
    os.remove(filepath)
    img.save(filepath)
    return {'r':2}

@app.route('/user/login', methods=['POST'])
@cross_origin(supports_credentials=True)
def user_login():
    # Set up hashing
    import bcrypt
    email = request.form['email']
    remember = request.form['remember']
    from database import db_user_load_by_email
    user = db_user_load_by_email(email)
    if (user == None):
        return {
            'error': True,
            'message': "User email not found",
            'current_user': None,
        }
        
    if (bcrypt.checkpw(request.form['password'].encode('utf8'), user.password_hash.encode('utf8'))):
        #user.setAuthenticated() # Do something here to set when logged in
        session.permanent = True
        flask_login.login_user(user, remember) # Part of flask_login
        user_dict = user.as_dict()
        user_dict.pop('password_hash') # Remove password_hash before sending to front_end
        return {
            'error': False,
            'message': "Successful login",
            'current_user': user_dict,
        }

    else:
        return {
            'error': True,
            'message': "Password mismatch",
            'current_user': None,
        }

@app.route('/user/logout', methods=['POST'])
#@flask_login.login_required
@cross_origin(supports_credentials=True)
def user_logout():
    if flask_login.current_user.is_authenticated: 
        flask_login.logout_user() # Part of flask_login
        return {
            'error': False,
            'message': "Successful logout",
            'current_user': None,
        }
    else:
        return {
            'error': True,
            'message': "Not logged in",
            'current_user': None,
        }
    
# Google-signin
# TODO: needs to be linked to our user table (and create a new user upon first login, if email not already exist)

@app.route('/sign_in',methods=['POST'])
@cross_origin(supports_credentials=True)
def sign_in():
    email = request.form["email"]
    session['email']=email
    arr= np.zeros((1000,1000))
    for i in range(len(arr)):
        for j in range(len(arr[i])):
            arr[i][j]=i+j
        
    session['based_arr'] = arr
    print(session.get('email'))
    return 'kk'

@app.route('/analysis_edit/<filename>',methods = ['POST'])
@cross_origin(supports_credentials=True)
def analysis_edit(filename):
    doRF = request.form['doRF']=='true'
    doUV = request.form['doUV']=='true'
    autoLane=request.form['autoLane']=='true' and not (doRF or doUV)
    if autoLane:
        num_lanes=int(request.form['n_l'])
    else:
        num_lanes=1
    
    
    ##print(request.form['autoLane'])
    ##print(request.form['autoLane']=='true' and (not doRF and not doUV))
    ##print(autoLane)

    try:
        newOrigins = ast.literal_eval(request.form.getlist('origins')[0])
        
    except:
        print('NOO')
        newOrigins = []
    print('newo',newOrigins)
    newOrigins = [newOrigins]

    newROIs = (request.form.getlist('ROIs'))
    #print(newROIs)
    #print(newROIs[0])
    #print(newROIs[0][0])
    newROIs = ast.literal_eval(newROIs[0])
    #print(newROIs)
    newROIs = analysis.flatten(newROIs)
    #print('n',newROIs)
    Analysis = analysis(newROIs, num_lanes,newOrigins,filename,doUV,doRF,autoLane)
    Analysis.sort2(Analysis.origins,index = 0)
    Analysis.origins=Analysis.origins[0]
    Analysis.origins = Analysis.origins[::-1]
    Analysis.organize_into_lanes()
    data = {}
    data['ROIs'] = Analysis.ROIs
    data['origins'] =Analysis.origins
    data['doRF'] =  doRF

    db_analysis_edit(data,filename)
    return{"ROIs":Analysis.ROIs}
    
    
    
@app.route('/retrieve_analysis/<filename>',methods=['GET'])
@cross_origin(supports_credentials=True)
def retrieve_analysis(filename):
    session['cerenkovcalc'] = np.load(retrieve_image_path('cerenkovcalc',filename))
    session['cerenkovradii']=np.load(retrieve_image_path('cerenkovradii',filename))
    analysis_retrieved = retrieve_initial_analysis(filename)
    return{
        'ROIs':analysis_retrieved['ROIs'],
        'origins':analysis_retrieved['origins'],
        'doRF':analysis_retrieved['doRF'],
        'filenumber':filename,
        'name':analysis_retrieved['name'],
        'description': analysis_retrieved['description'],
    }

@app.route('/time', methods = ['POST','GET'])
@cross_origin(supports_credentials=True)
def createFile():
    if request.method == 'POST':
        
        Dark = request.files['Dark']
        Dark2 = request.files['Dark']
        Flat = request.files['Flat']
        Cerenkov = request.files['Cerenkov']
        UV = request.files['UV']
        UVFlat = request.files['UVFlat']
        Bright = request.files['Bright']
        BrightFlat = request.files['BrightFlat']
        Flat2 = request.files['Flat']
        Cerenkov2 = request.files['Cerenkov']
        UV2 = request.files['UV']
        UVFlat2 = request.files['UVFlat']
        Bright2 = request.files['Bright']
        BrightFlat2 = request.files['BrightFlat']
        CerenkovName=request.form['CerenkovName']
        UVName=request.form['UVName']
        BrightName=request.form['BrightName']
        DarkName=request.form['DarkName']
        UVName=request.form['UVName']
        UVFlatName=request.form['UVFlatName']
        BrightFlatName=request.form['BrightFlatName']
        FlatName=request.form['FlatName']

        ##print('r',request.form)
        
        names = [CerenkovName,DarkName,FlatName,UVName,UVFlatName,BrightName,BrightFlatName]

        
        tim = generate_key()
        img_cerenk = finalize(Dark,Dark2,Flat,Flat2,Cerenkov,Cerenkov2,UV,UV2,UVFlat,UVFlat2,Bright,Bright2,BrightFlat,BrightFlat)
        Cerenkov = img_cerenk[1]
        os.mkdir(f'./UPLOADS/{tim}')
        np.save("./UPLOADS/"+tim+'/cerenkovradii.npy',Cerenkov)
        img = img_cerenk[0]
        doUV = img_cerenk[2]
        current_analysis = analysis([],0,[],tim,doUV,doUV,doUV,names)
        if doUV:
            calc = img_cerenk[-3]
        else:
            calc = img_cerenk[-2]

        np.save('./UPLOADS/'+tim+'/cerenkovcalc.npy',calc)
        
        img = img-np.min(img)
        img = img *1/np.max(img)
        img = Image.fromarray((np.uint8(plt.get_cmap('viridis')(img)*255)))
        filepath = './UPLOADS/'+tim+'/cerenkovdisplay.png'
        img.save(filepath)
        if doUV:
            Cerenkov_show = img_cerenk[3]
            UV_show = img_cerenk[4]
            Cerenkov_show.save('./UPLOADS/'+tim+'Cerenkov.png')
            UV_show.save('./UPLOADS/'+tim+'UV.png')
            calc = img_cerenk[-2]
            np.save('./UPLOADS/'+tim+'cerenkovcalc.npy',calc)
        current_analysis.predict_ROIs(calc,Cerenkov)
        data = {}
        data['radio_name'] = CerenkovName
        data['dark_name']=DarkName
        data['flat_name']=FlatName
        data['uv_name'] = UVName
        data['bright_name'] = BrightName
        data['dark'] = request.files['Dark']
        data['flat']=request.files['Flat']
        data['radio'] = request.files['Cerenkov']
        data['uv'] = request.files['UV']
        data['bright'] = request.files['Bright']
        data['ROIs'] = [current_analysis.ROIs]
        data['origins'] = []
        data['doRF'] = False
        data['name'] = request.form['name']
        data['description'] = request.form['description']

        data['user_id'] = flask_login.current_user.get_id()
        
        db_analysis_save_initial(data, tim)
        #print('success')
        
        #print(analysis.build_analysis(np.load(f'./UPLOADS/analysis{tim}.npy')))
        
        ###print(points)
        
        res = tim
        return {"res":res}

@app.route('/img/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def give(filename):
    filen = retrieve_image_path('cerenkovdisplay',filename)
    print(filen)
    return send_file(filen)

@app.route('/radius/<filename>/<x>/<y>/<shift>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def findRadius(filename,x,y,shift):
    
    tim = time.time()
    img = session.get('cerenkovradii')
    rowRadius = 0
    colRadius = 0
    num_zeros = 0

    row = int(y)
    col = int(x)
    #print(shift)
    if (shift=='0'):
        for i in range(3):
            center  = analysis.find_RL_UD(img,[(row,col)])
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

@app.route('/UV/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def giveUV(filename):
    filen = './UPLOADS/'+filename+'/UV.png' 
    return send_file(filen)

@app.route('/Cerenkov/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def giveCerenkov(filename):
    filen = retrieve_image_path('cerenkovdisplay',filename) 
    return send_file(filen)

    
@app.route('/data/',methods=['POST'])
@cross_origin(supports_credentials=True)
def data():
    np.load.__defaults__=(None, True, True, 'ASCII')
    np_load_old = np.load
    CerenkovName=request.form['CerenkovName']
    UVName=request.form['UVFlatName']
    DarkName=request.form['DarkName']
    UVName=request.form['UVName']
    UVFlatName=request.form['UVFlatName']
    FlatName=request.form['FlatName']
    Lanes = request.form['Lanes']
    name = f'c@~{CerenkovName}cd@~{DarkName}cf@~{FlatName}u@~{UVName}uf@~{UVFlatName}l@~{Lanes}'
    filename = str(np.load(f'./database/{name}.npy'))
    #print('fname:',filename)
    return {'Key':filename}

@app.route('/results/<filename>',methods = ['GET'])
@cross_origin(supports_credentials=True)
def results(filename):
        analysis_data = retrieve_initial_analysis(filename)
        analysis_retrieve = analysis(analysis_data['ROIs'],None,analysis_data['origins'],filename,'UVName' in analysis_data, analysis_data['doRF'],False)
        analysis_results =analysis_retrieve.results()

        #print(analysis_results)
        return{"arr":analysis_results}

@app.route('/upload_data/<filename>',methods=['POST'])
@cross_origin(supports_credentials=True)
def upload_data(filename):
    analysis = retrieve_initial_analysis(filename)
    data = request.form.to_dict()
    data['user_id'] = flask_login.current_user.get_id()
    db_analysis_save(request.form.to_dict(),filename)
    return 'yes'

    
if __name__ == '__main__':
    # TODO: consider what should go here, in 'before_app_first_request' or at the top of this file
    # (This is only run when it is the main app, not included in another file)
    ##print("Running!")
    app.run(host='0.0.0.0',debug=False,port=5000)
