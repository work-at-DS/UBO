/******************************************************************************************
*  Class Name       : ds_lex_PortalRequestController
*  Author           : Manoj Patil
*  Department       : Dubai South (Customer Portal)
*  Date             : 17/02/2023 
*  Description      : this class is used as service class to fetch data on portal request page.          
---------------------------------------------------  -------------------
Version     Date            Author                Remarks                                                
=======   ==========       =============    ==================================
v1.1    01/03/2023       Manoj Patil        Initial Version   
*******************************************************************************************/
public without sharing class ds_lex_PortalRequestController {
  private static Map<Id, String> previousPageMap;
  private static Map<Id, String> nextPageMap;

  @AuraEnabled
  public static List<acbox__Section_Detail__c> getSingleSectionDetail(String sectionDetailId) {
    return [SELECT Id, Refresh_Page_on_Change__c FROM acbox__Section_Detail__c where id =:sectionDetailId limit 1 ];
  }

  @AuraEnabled
  public static Map<String, Object> getDocumentDescription(String actId, String cmpName) {
      // Initialize the map to hold the result
      Map<String, Object> resultMap = new Map<String, Object>();
  
      // Query for the acbox__Action_Page_Flow__c records matching the given criteria
      List<acbox__Action_Page_Flow__c> pageFlows = [
          SELECT id, acbox__Description__c, acbox__Action_Template__r.Allow_Additional_Documents__c
          FROM acbox__Action_Page_Flow__c
          WHERE acbox__Action_Template__c = :actId AND acbox__Community_Page_URL__c = :cmpName
      ];
  
      // If records are found, get the values from the first record
      if (!pageFlows.isEmpty()) {
          String docDesc = pageFlows[0].acbox__Description__c;
          Boolean allowAdditionalDoc = pageFlows[0].acbox__Action_Template__r.Allow_Additional_Documents__c;
  
          // Add the values to the map
          resultMap.put('docDesc', docDesc);
          resultMap.put('allowAdditionalDoc', allowAdditionalDoc);
      } else {
          // If no records are found, add default values
          resultMap.put('docDesc', '');
          resultMap.put('allowAdditionalDoc', false);
      }
  
      // Return the result map
      return resultMap;
  }
  

  @AuraEnabled
  public static List<String> getPicklistValues(String objName, string fieldName) {
    List<String> picklistValues = new List<String>();

    for (Schema.PicklistEntry pL : DS_Commonutility.getPicklistValues(objName, fieldName)) {
      picklistValues.add(pL.label);
    }
    return picklistValues;
  }

  @AuraEnabled
  public static boolean showChangeStatus(String requestId) {
    try {
      System.debug('ABCDEEEE:: ' + ID.valueOf(requestId).getSObjectType().getDescribe().getName());
      acbox__Request_Action__c currentRequestAction = [
        SELECT id, freezone_request__c,acbox__Action_Task__r.acbox__Unique_Key__c, freezone_request__r.Change_Status__c, freezone_request__r.Is_Applicant_In_Country__c, freezone_request__r.Action_Template_Unique_Code__c
        FROM acbox__Request_Action__c
        WHERE (Id = :requestId OR acbox__Record_Id__c = :requestId) AND acbox__Record_Id__c != NULL
        LIMIT 1
      ];
      if (
        currentRequestAction.freezone_request__c != null &&
        currentRequestAction.freezone_request__r.Is_Applicant_In_Country__c &&
        currentRequestAction.freezone_request__r.Action_Template_Unique_Code__c.contains('NewEmploymentVisa') &&
        currentRequestAction.acbox__Action_Task__r.acbox__Unique_Key__c.equalsIgnoreCase('Upload Stage 2 Documents')
      ) {
        if (!currentRequestAction.freezone_request__r.Change_Status__c) {
          return true;
        }
        return false;
      } else {
        return false;
      }
    } catch (Exception e) {
      throw new AuraHandledException(e.getMessage());
    }
  }
  
  @AuraEnabled
  public static String getTemplateUniqueCode(Id requestId) {
     
      String sObjectType = requestId.getSObjectType().getDescribe().getName();
      String query = 'SELECT Action_Template__r.acbox__Unique_Code__c FROM ' + sObjectType + ' WHERE Id = :requestId LIMIT 1';
      SObject result = Database.query(query);
      String uniqueCode = (String)result.getSObject('Action_Template__r').get('acbox__Unique_Code__c');
      return uniqueCode;
  }

  @AuraEnabled
  public static ds_PortalRequestsWrapper.ApplicationHistory getApplicationHistory(String serviceRequestId) {
    ds_PortalRequestsWrapper.ApplicationHistory wrapper = new ds_PortalRequestsWrapper.ApplicationHistory();
    List<ds_PortalRequestsWrapper.CommentHistory> wrapperCommentHistoryList = new List<ds_PortalRequestsWrapper.CommentHistory>();
    /* List<ds_PortalRequestsWrapper.StatusHistory> wrapperStatusHistoryList = new List<ds_PortalRequestsWrapper.StatusHistory>(); */
    ds_PortalRequestsWrapper.CommentHistory wrapperCommentHistory;
    /* ds_PortalRequestsWrapper.StatusHistory wrapperStatusHistory; */
    List<acbox__Request_Action__c> reqActList = new List<acbox__Request_Action__c>();
    List<acbox__Request_Action__c> acttionTaskList = new List<acbox__Request_Action__c>();
    reqActList = [
      SELECT
        Id,
        Name,
        acbox__Status__c,
        LastModifiedBy.Name,
        LastModifiedBy.UserType,
        acbox__Closed_Datetime__c,
        acbox__Action_Task__r.acbox__Is_Available_On_Portal__c,
        CreatedDate,
        acbox__Comments__c,
        Action_Status__c,
        Action_Name__c
      FROM acbox__Request_Action__c
      WHERE acbox__Record_Id__c = :serviceRequestID AND acbox__Status__c != 'End'
      ORDER BY CreatedDate DESC
    ];
    for (acbox__Request_Action__c ra : reqActList) {
      if (String.IsNotBlank(ra.acbox__Comments__c) && ra.acbox__Action_Task__r.acbox__Is_Available_On_Portal__c) {
        wrapperCommentHistory = new ds_PortalRequestsWrapper.CommentHistory();
        wrapperCommentHistory.Id = ra.Id;
        wrapperCommentHistory.createdBy = ra.LastModifiedBy.UserType == 'Standard' ? 'DACC Team' : ra.LastModifiedBy.Name;
        wrapperCommentHistory.createDate = ra.CreatedDate;
        wrapperCommentHistory.comment = ra.acbox__Comments__c;
        wrapperCommentHistoryList.add(wrapperCommentHistory);
      }
      /* if(ra.acbox__Action_Task__r.acbox__Is_Available_On_Portal__c){
                wrapperStatusHistory = new ds_PortalRequestsWrapper.StatusHistory();
                wrapperStatusHistory.Id = ra.Id;
                wrapperStatusHistory.Status =  ra.Action_Status__c;
                wrapperStatusHistory.comment =  ra.acbox__Comments__c;
                wrapperStatusHistory.Name = ra.Action_Name__c ;
                wrapperStatusHistory.StatusChangeDate = ra.Action_Date__c;
                wrapperStatusHistoryList.add(wrapperStatusHistory);
            } */
    }
    if (!wrapperCommentHistoryList.isEmpty())
      wrapper.CommentHistory = wrapperCommentHistoryList;
    //if(!wrapperStatusHistoryList.isEmpty()) wrapper.StatusHistory = wrapperStatusHistoryList;
    return wrapper;
  }

  @AuraEnabled
  public static Map<String, acbox__Request_Action__c> getActionForService(String requestActionID) {
    String fileObjName = ID.valueOf(requestActionID).getSObjectType().getDescribe().getName();
    acbox__Request_Action__c rec = new acbox__Request_Action__c();
    Map<String, acbox__Request_Action__c> returnMap = new Map<String, acbox__Request_Action__c>();
    if (fileObjName == 'acbox__Request_Action__c') {
      rec = DS_Commonutility.getActionForService(requestActionID);
    }

    String query =
      'SELECT Id  FROM acbox__Request_Document__c WHERE ' +
      ' acbox__Record_Id__c=' +
      DS_Commonutility.escapeString(rec.acbox__Record_Id__c) +
      ' AND acbox__Status__c=' +
      DS_Commonutility.escapeString('Re-upload') +
      ' LIMIT 1';

    List<acbox__Request_Document__c> docList = Database.query(query);
    if (docList.isEmpty()) {
      returnMap.put('info', rec);
    } else {
      returnMap.put('doc', rec);
    }
    return returnMap;
  }

  @AuraEnabled
  public static sObject getServiceName(String requestID) {
    String fileObjName = ID.valueOf(requestID).getSObjectType().getDescribe().getName();
    String query = 'Select id, Name, Action_Template__r.Name from ' + fileObjName + ' Where Id =:requestID';
    List<sObject> sObj = database.Query(query);
    return sObj[0];
  }

  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response completeReUploadReqDoc(String srId) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    List<acbox__Request_Document__c> reqDocListToUpdate = new List<acbox__Request_Document__c>();
    List<acbox__Request_Document__c> reuploadedReqDocList = [SELECT Id, Re_upload_in_Progress__c FROM acbox__Request_Document__c WHERE acbox__Record_Id__c = :srId AND Re_upload_in_Progress__c = TRUE];
    for (acbox__Request_Document__c reqDoc : reuploadedReqDocList) {
      reqDoc.Re_upload_in_Progress__c = false;
      reqDocListToUpdate.add(reqDoc);
    }
    if (!reqDocListToUpdate.isEmpty()) {
      update reqDocListToUpdate;
      res.isSuccess = true;
      res.Status = 'Success';
      res.error = '';
    }
    return res;
  }

  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response updateAction(acbox__Request_Action__c raObject) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    system.debug(raObject);
    Database.SaveResult updateResult = Database.update(raObject);
    if (updateResult.isSuccess()) {
      res.isSuccess = true;
      res.Status = 'Success';
      res.error = '';
    } else {
      // Error ds_PortalRequestsWrapper.Response
      res.isSuccess = false;
      res.Status = 'Error';
      res.error = 'Error while delete the file. Please contact Support.';
      System.debug('Error Updating record: ' + updateResult.getErrors()[0].getMessage());
    }
    return res;
  }

  @AuraEnabled
  public static user getUserDetails() {
    return DS_Commonutility.getCurrentUserInfo();
  }

  @AuraEnabled
  public static ds_PortalActionTemplateFlowWrapper.ActionTemplatesListWrapper getAllActionTemplates() {
    user userDetails = DS_Commonutility.getCurrentUserInfo();
    Set<String> departments = new Set<String>();
    ds_PortalActionTemplateFlowWrapper.ActionTemplatesListWrapper wrapper = new ds_PortalActionTemplateFlowWrapper.ActionTemplatesListWrapper();
    if (String.isNotBlank(userDetails.Portal_User_Role__c)) {
      List<String> deptValuesFull = userDetails.Portal_User_Role__c.split(';');
      for (String str : deptValuesFull) {
        List<String> dept = str.trim().split(' ');
        departments.add(dept[0]);
      }
      List<acbox__Action_Template__c> actionTemplateList = acbox.BaseDataClass.ListofActionTemplate(userDetails.Account_Id__c, UserInfo.getUserId());
      // Filter out records where Hide_from_Services_Frequent_Used_Tab__c = true
      List<acbox__Action_Template__c> filteredList = new List<acbox__Action_Template__c>();
      for (acbox__Action_Template__c template : actionTemplateList) {
        //Added depart dsp condition by shubham to filter out the dsp related services
        if (!template.Hide_From_Services_Page__c && template.Department__c!='DSP') {
          filteredList.add(template);
        }
      }
      wrapper.actionTemplatesList = filteredList;
      wrapper.departments = departments;
    }
    return wrapper;
    //return ds_PortalValidationCntrl.getListOfActionTemplatesCustomValidation(filteredList, UserInfo.getUserId(), u.Account_Id__c);
  }

  @AuraEnabled
  public static String getConsentDescription(String pageFlowId) {
    return [SELECT acbox__Description__c FROM acbox__Action_Page_Flow__c WHERE Id = :pageFlowId].acbox__Description__c;
  }

  @AuraEnabled
  public static List<ds_PortalActionTemplateFlowWrapper.ActionTemplateWrapper> getActionTemplateDetails(String actionTemplateID, String serviceRequestID) {
    List<ds_PortalActionTemplateFlowWrapper.ActionTemplateWrapper> actionTemplateList = new List<ds_PortalActionTemplateFlowWrapper.ActionTemplateWrapper>();
    List<acbox__Action_Template__c> iterActTemplateList = [
      SELECT
        Id,
        Name,
        acbox__Unique_Code__c,
        acbox__Active__c,
        acbox__Description__c,
        Menu_Description__c,
        Business_Area__c,
        Menu_Group__c,
        Menu_Text__c,
        Menu_Subtext__c,
        View_URL__c,
        acbox__Object_API_Name__c,
        acbox__Child_Object_Task_Field_API__c,
        Skip_Feedback__c,
        (
          SELECT Id, Name, acbox__Active__c, acbox__Community_Page_URL__c, acbox__Description__c, acbox__Menu_Title__c, acbox__Order__c, Menu_Description__c, acbox__Pathway_Guide__c
          FROM acbox__Action_Page_Flows__r
          WHERE acbox__Active__c = TRUE
          ORDER BY acbox__Order__c ASC
        ),
        (
          SELECT Id, Name, acbox__Active__c, acbox__Description__c, acbox__Order__c, acbox__Price__c
          FROM acbox__Request_Prices__r
          WHERE acbox__Active__c = TRUE
          ORDER BY acbox__Order__c ASC
        ),
        (
          SELECT Id, Name
          FROM acbox__Action_Tasks__r
          WHERE acbox__Active__c = TRUE
        )
      FROM acbox__Action_Template__c
      WHERE Id = :actionTemplateID OR acbox__Unique_Code__c = :actionTemplateID
    ];

    for (acbox__Action_Template__c iterActTemplate : iterActTemplateList) {
      ds_PortalActionTemplateFlowWrapper.ActionTemplateWrapper actInstance = new ds_PortalActionTemplateFlowWrapper.ActionTemplateWrapper();
      //Template Id paramenter added by Vinod
      actInstance.actionFlowList = initializeActionPageFlows(iterActTemplate.Id, iterActTemplate.acbox__Action_Page_Flows__r, serviceRequestID);
      actInstance.actionTemplate = iterActTemplate;
      actionTemplateList.add(actInstance);
    }
    return actionTemplateList;
  }

  private static List<ds_PortalActionTemplateFlowWrapper.ActionPageFlowWrapper> initializeActionPageFlows(String actionTemplateId, List<acbox__Action_Page_Flow__c> actionPageFlowRecordsList, String serviceRequestID) 
  {
  System.debug('===initializeActionPageFlows====');
    List<ds_PortalActionTemplateFlowWrapper.ActionPageFlowWrapper> actionPageFlowWrapperInstances = new List<ds_PortalActionTemplateFlowWrapper.ActionPageFlowWrapper>();
    if (String.isNotblank(serviceRequestID)) {
      //Below line added by Vinod to hide the sidebar components based on condition
      system.debug('actionTemplateId==='+actionTemplateId);
        system.debug('before serviceRequestID==='+serviceRequestID);
      actionPageFlowRecordsList = acbox.BaseDataClass.PageFlowList(actionTemplateId, serviceRequestID);
         system.debug('after serviceRequestID==='+serviceRequestID);
         
      system.debug('actionPageFlowRecordsList==='+actionPageFlowRecordsList);
      actionPageFlowRecordsList.remove(0);
    }
    // initializePageNavigations(actionPageFlowRecordsList);
    Integer order = 0;
    for (acbox__Action_Page_Flow__c iterActionPageFlow : actionPageFlowRecordsList) {
      iterActionPageFlow.acbox__Order__c = order;
      ds_PortalActionTemplateFlowWrapper.ActionPageFlowWrapper actionPageFlowWrapperInstance = new ds_PortalActionTemplateFlowWrapper.ActionPageFlowWrapper();
      actionPageFlowWrapperInstance.actionFlowInstance = iterActionPageFlow;
      actionPageFlowWrapperInstances.add(actionPageFlowWrapperInstance);
      order++;
    }
    return actionPageFlowWrapperInstances;
  }

  /* private 
        static void initializePageNavigations(List<acbox__Action_Page_Flow__c> actionPageFlowRecordsList) {
            String previousPageName = '';
            String nextPageName = '';
            previousPageMap = new Map<Id, String>();
            nextPageMap = new Map<Id, String>();
            
            for (Integer iter = 0; iter < actionPageFlowRecordsList.size(); iter++) {
                if (iter == 0)
                {
                    previousPageMap.put(actionPageFlowRecordsList.get(iter).Id, null);
                } else 
                {
                    previousPageName = actionPageFlowRecordsList.get(iter - 1).acbox__Community_Page_URL__c;
                    previousPageMap.put(actionPageFlowRecordsList.get(iter).Id, previousPageName);
                }
                if (iter == actionPageFlowRecordsList.size() - 1) {
                    nextPageMap.put(actionPageFlowRecordsList.get(iter).Id, null);
                } else {
                    nextPageName = actionPageFlowRecordsList.get(iter + 1).acbox__Community_Page_URL__c;
                    nextPageMap.put(actionPageFlowRecordsList.get(iter).Id, nextPageName);
                }
            }
        } */

  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response createServiceRequest(Sobject sObj, List<Sobject> lstsObj, string parentObjectFieldName, String actionPageFlowId, String hasChangeFieldAPIName) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    String className = '';

    List<acbox.PageFlowFields> returnCurrentListOfSection;
    user u = DS_Commonutility.getCurrentUserInfo();
    String objectAPIName = '';
    Id srId;
    Set<String> currentFields = new Set<String>();
    Set<String> newFields = new Set<String>();
    Sobject sobjWithReRenderFields;
    String actionTempSubMenuTxt = '';

    if (String.IsNotBlank(actionPageFlowId) && String.IsNotBlank(hasChangeFieldAPIName)) {
      List<acbox__Section_Detail__c> lstSectionDetails = [
        SELECT acbox__Apex_Class__c
        FROM acbox__Section_Detail__c
        WHERE acbox__Action_Page_Flow__c = :actionPageFlowId AND acbox__Field_API_Name__c = :hasChangeFieldAPIName
      ];
      className = lstSectionDetails[0].acbox__Apex_Class__c;
    }

    if (String.IsNotBlank(actionPageFlowId)) {
      srId = String.ValueOf(sObj.get('Id'));
      objectAPIName = srId.getSObjectType().getDescribe().getName();

      returnCurrentListOfSection = acbox.RequestFormcontroller.getSectionsAndFields(srId, actionPageFlowId, objectAPIName);
      for (acbox.PageFlowFields section : returnCurrentListOfSection) {
        for (acbox__Section_Detail__c sectionDetails : section.ListSectionDetail) {
          currentFields.add(sectionDetails.acbox__Field_API_Name__c);
        }
      }
    }

    //Start  Arun Added this code code Class

    /*
            Find ClassNamelinked with field which has changed enabled.
            PageFlowapexClass:  class use to call from is Changed event 
            */
    if (String.IsNotBlank(className)) {
      PageFlowCustomCode v = (PageFlowCustomCode) Type.forName(className).newInstance();
      sObj = v.ProcessData(sObj, hasChangeFieldAPIName);
      //upsert srRec;
    }

    try {
      sObj.put('Account_Name__c', u.Account_Id__c);
      Map<String, Object> populatedFieldsAsMap = sObj.getPopulatedFieldsAsMap();
      string statusValue = '';
      system.debug('ALL POPULATED VALUES::'+populatedFieldsAsMap);
      if (populatedFieldsAsMap.containsKey('Status__c')) {
        statusValue = String.valueOf(populatedFieldsAsMap.get('Status__c'));
      }
      if(!statusValue.containsIgnoreCase('ENTRY PERMIT ISSUED') && !statusValue.containsIgnoreCase('CHANGE STATUS ISSUED')){
        sObj.put('Status__c', 'Draft');
      }
      

      if (sObj.getSObjectType() == Licensing_Request__c.SObjectType) {
        if ((String) sObj.get('Authority__c') != null) {
          Map<String, Licensing_Request_Authority__mdt> mapLrmdt = Licensing_Request_Authority__mdt.getAll();
          for (String authorityAPI : mapLrmdt.keyset()) {
            if (mapLrmdt.get(authorityAPI).Authority_Name_English__c == (String) sObj.get('Authority__c')) {
              sObj.put('Certificate_Letter_Authority__c', mapLrmdt.get(authorityAPI).Authority_Name_Arabic__c);
            }
          }
        }
      }
      // sObj.put('RecordTypeId' , );
      List<acbox__Action_Template__c> actiontemp = new List<acbox__Action_Template__c>();
      if (sObj.get('Action_Template__c') != null) {
        actiontemp = [SELECT Menu_Subtext__c, acbox__Unique_Code__c FROM acbox__Action_Template__c WHERE Id = :(Id) sObj.get('Action_Template__c')];
        if (actiontemp.size() > 0) {
            
            if (actiontemp[0].acbox__Unique_Code__c == 'Work_Permit')
                sObj.put('Working_Days__c','MON;TUE;WED;THU;FRI');

          if (actiontemp[0].acbox__Unique_Code__c == 'GCC_WORK_PERMIT' && sObj.get('GCC_Nationality__c') != null) {
            string gccNationality = string.valueof(sObj.get('GCC_Nationality__c'));

            List<Country__c> lstCountry = [SELECT id FROM Country__c WHERE name = :gccNationality];
            if (lstCountry.size() > 0) {
              sObj.put('Current_Nationality__c', lstCountry[0].Id);
            }
          }
          if((actiontemp[0].acbox__Unique_Code__c == 'Share Certificate-True Copy Revamp' || actiontemp[0].acbox__Unique_Code__c == 'Share Certificate-True Copy' || actiontemp[0].acbox__Unique_Code__c == 'Share Certificate' )  && sObj.get('Share_Ownership__c') != null){
            String reqId = String.ValueOf(sObj.get('Id'));
            Licensing_Request__c lr = new Licensing_Request__c();
            lr=[Select id,Account_Name__c,Share_Ownership__c from Licensing_Request__c where id=:reqId];
            List<Share_Ownership__c> shList = new List<Share_Ownership__c>();
            shList =[Select Id,No_of_Shares__c,Company__c from Share_Ownership__c where Company__c =:lr.Account_Name__c and Id=:String.ValueOf(sObj.get('Share_Ownership__c')) ];
            if(shList.size()>0){
              sObj.put('No_of_Shares__c', shList[0].No_of_Shares__c);
            }
          }

        }
      }
      upsert sObj;

      //get recent fields on update
      List<acbox.PageFlowFields> returnListOfSection = acbox.RequestFormcontroller.getSectionsAndFields(srId, actionPageFlowId, objectAPIName);
      //compare old and new rendered fields
      for (acbox.PageFlowFields section : returnListOfSection) {
        for (acbox__Section_Detail__c sectionDetails : section.ListSectionDetail) {
          newFields.add(sectionDetails.acbox__Field_API_Name__c);
        }
      }

      //compare re render fields
      Map<String, Schema.SObjectType> globalObjects = Schema.getGlobalDescribe();
      Schema.SObjectType objType = globalObjects.get(objectAPIName);
      Map<String, Schema.SObjectField> fieldMap = objType.getDescribe().fields.getMap();
      for (String fieldAPI : currentFields) {
        if (!newFields.contains(fieldAPI)) {
          if (sobjWithReRenderFields == null) {
            sobjWithReRenderFields = Schema.getGlobalDescribe().get(objectAPIName).newSObject();
          }

          /**
           * Conditions to ignore formula fields and update boolean fields seperately
           */
          Schema.SObjectField field = fieldMap.get(fieldAPI);
          Schema.DescribeFieldResult fieldDescribe = field.getDescribe();
          if (fieldDescribe.isUpdateable() && !fieldDescribe.isCalculated()) {
            if (fieldDescribe.getType() == Schema.DisplayType.Boolean) {
              sobjWithReRenderFields.put(fieldAPI, false);
            } else {
              sobjWithReRenderFields.put(fieldAPI, null);
            }
          }
        }
      }

      //update hidden re render fields to blank values
      if (sobjWithReRenderFields != null) {
        sobjWithReRenderFields.put('Id', srId);
        update sobjWithReRenderFields;
      }

      if (actiontemp.size() > 0) {
        //query on action template to get menu subtext
        // List<acbox__Action_Template__c> actiontemp = [SELECT Menu_Subtext__c, acbox__Unique_Code__c FROM acbox__Action_Template__c WHERE Id = :(Id) sObj.get('Action_Template__c')];
        actionTempSubMenuTxt = actiontemp[0].Menu_Subtext__c;
        if (actiontemp[0].acbox__Unique_Code__c == 'VisitVisaFileOpening')
          updatePayment(sObj);

        if (actiontemp[0].acbox__Unique_Code__c == 'Entry_Permit_Cancellation') {
          BizFlow_PermitCancellation inst = new BizFlow_PermitCancellation();
          inst.processData(sObj, '');
        }
          
          if (actiontemp[0].acbox__Unique_Code__c == 'ReturnPermit') {
              BizFlow_ReEntryCalculations inst = new BizFlow_ReEntryCalculations();
              inst.processData(sObj, '');
          }


        if (actiontemp[0].acbox__Unique_Code__c == 'New_Customer_Portal_User')
          sObj.put('Category__c', 'Additional User Creation Request');
      }

      if (
        actionTempSubMenuTxt == 'E-Services Portal (Logistics District Day Pass)' ||
        actionTempSubMenuTxt == 'E-Services Portal (Short Term Access Pass)' ||
        actionTempSubMenuTxt == 'Day Pass' ||
        actionTempSubMenuTxt == 'Short Term Access Pass' ||
        actionTempSubMenuTxt == 'Report Incident'                   //added by Udit for Incident Mgmt
      ) {
        ds_RevampLogisticsUtil.processDayPass(sObj, lstsObj, parentObjectFieldName, actionTempSubMenuTxt);
      }
      if (
        actiontemp[0].acbox__Unique_Code__c == 'LicenseRenewal' ||
        actiontemp[0].acbox__Unique_Code__c == 'Add or Remove License Activity' ||
        actiontemp[0].acbox__Unique_Code__c == 'License Cancellation' ||
        actiontemp[0].acbox__Unique_Code__c == 'FreelanceLicenseRenewal'
      ) {
        //Prod code
        //ds_LicensePortalRequest.processDocuments(sObj.Id, actiontemp[0].acbox__Unique_Code__c);
        // UAt code
        LicenseAmendmentActions.processDocuments(sObj.Id, actiontemp[0].acbox__Unique_Code__c);
      }
      sObject sObj1 = getServiceName(String.ValueOf(sObj.get('Id')));
      res.msg = String.ValueOf(sObj1.get('Name'));
      res.isSuccess = true;
      res.Status = 'Success';
      res.recId = String.ValueOf(sObj.get('Id'));
      res.error = '';
    } catch (Exception e) {
      res.isSuccess = false;
      res.Status = 'Error';
      //res.recId = '';
      res.error = e.getMessage() + '--' + e.getLineNumber();
      //system.debug('');
    }
    return res;
  }

  public static void updatePayment(Sobject sObj) {
    freezone_request__c ObjFZ = (freezone_request__c) sObj;

    if (ObjFZ.Long_Term_Visa__c && ObjFZ.Long_Term_Visa_Quota__c != null && ObjFZ.Long_Term_Visa_Quota__c != '') {
      acbox__Request_Price__c reqPrice = new acbox__Request_Price__c();
      reqPrice = [
        SELECT id, acbox__Price__c, Reference_Price__c
        FROM acbox__Request_Price__c
        WHERE name = 'Long Term Visit visa deposit (refundable deposit paid to GDRFA)' AND freezone_request__c = :ObjFZ.Id
      ];
      reqPrice.acbox__Price__c = reqPrice.Reference_Price__c * ((Integer.valueof(ObjFZ.Long_Term_Visa_Quota__c)) / 5);
      update reqPrice;
    }

    if (ObjFZ.Short_Term_Visa__c && ObjFZ.Short_Term_Visa_Quota__c != null && ObjFZ.Short_Term_Visa_Quota__c != '') {
      acbox__Request_Price__c reqPrice = new acbox__Request_Price__c();
      reqPrice = [
        SELECT id, acbox__Price__c, Reference_Price__c
        FROM acbox__Request_Price__c
        WHERE name = 'Short Term Visit visa deposit (refundable deposit paid to GDRFA)' AND freezone_request__c = :ObjFZ.Id
      ];
      reqPrice.acbox__Price__c = reqPrice.Reference_Price__c * (Integer.valueof(ObjFZ.Short_Term_Visa_Quota__c) / 5);
      update reqPrice;
    }
  }

  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response updateServiceRequest(Sobject sObj) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    try {
      update sObj;
      res.isSuccess = true;
      res.Status = 'Success';
      res.recId = String.ValueOf(sObj.get('Id'));
      res.error = '';
    } catch (DmlException e) {
      res.isSuccess = false;
      res.Status = 'Error';
      //res.recId = '';
      res.error = e.getMessage();
      //system.debug('');
    }
    return res;
  }
  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response deleteServiceRequest(Sobject sObj) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    List<sObject> sObjList = new List<sObject> ();
    List<sObject> sObjListToDelete = new List<sObject> ();
    String query = 'SELECT id, (Select id FROM Request_Documents__r),(Select id FROM Request_Products__r) FROM ' + sObj.getSObjectType() + ' WHERE id =' +ds_SOQLLibrary.escapeString(sObj.Id)+ ' limit 1';
    try {
      sObjList = Database.query(query);    
      sObjListToDelete.add(sObj);
      if( sObjList[0].getSObjects('Request_Products__r') != null){
        sObjListToDelete.addAll(sObjList[0].getSObjects('Request_Products__r') );
      }
      if( sObjList[0].getSObjects('Request_Documents__r') != null){
        sObjListToDelete.addAll(sObjList[0].getSObjects('Request_Documents__r') );
      }
      delete sObjListToDelete;
      res.isSuccess = true;
      res.Status = 'Success';
    } catch (DmlException e) {
      res.isSuccess = false;
      res.Status = 'Error';
      //res.recId = '';
      res.error = e.getMessage();
      //system.debug('');
    }
    return res;
  }

  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response updateServiceReqWithNewPhoto(String serviceRequestId, String cdId) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    res.isSuccess = false;
    String sObjName = Id.valueOf(serviceRequestId).getSObjectType().getDescribe().getName();
    ContentVersion cv = [SELECT Id, Title FROM ContentVersion WHERE ContentDocumentId = :cdId WITH SYSTEM_MODE LIMIT 1];
    ContentDistribution conDis = new ContentDistribution();
    conDis.Name = cv.Title;
    conDis.ContentVersionId = cv.Id;
    conDis.PreferencesAllowViewInBrowser = true;
    insert conDis;
    ContentDistribution fileData = [SELECT Name, ContentDownloadUrl, DistributionPublicUrl FROM ContentDistribution WHERE ContentDocumentId = :cdId WITH SYSTEM_MODE ORDER BY createddate DESC LIMIT 1];
    if (fileData != null) {
      sObject recordUpdate = Schema.getGlobalDescribe().get(sObjName).newSObject();
      recordUpdate.id = Id.valueOf(serviceRequestId);
      recordUpdate.put('Photo_PublicURL__c', fileData.ContentDownloadUrl);
      update recordUpdate;
      res.isSuccess = true;
    }
    return res;
  }

  @AuraEnabled
  public static ActionRequestDocumentWrapper getRequestDocumentById(String recId) {
    system.debug('recId ' + recId);
    ActionRequestDocumentWrapper reqDocWrapper = new ActionRequestDocumentWrapper();
    List<acbox__Request_Document__c> carDocRec = [SELECT id, acbox__Record_Id__c FROM acbox__Request_Document__c WHERE id = :recId];
    String requestID = carDocRec[0].acbox__Record_Id__c;

    String query =
      'SELECT Id, Document_Reference__c, Name, acbox__Description__c,acbox__Record_Id__c, acbox__Status__c, acbox__File_Document_SF_18__c, acbox__Action_Document__r.acbox__Order__c, acbox__Action_Document__r.acbox__Action_template__r.acbox__Child_Object_Task_Field_API__c,' +
      ' acbox__Action_Document__r.acbox__Long_Description__c, acbox__Action_Document__r.acbox__Allow_only_JPEG_upload__c, acbox__Action_Document__r.acbox__Document_Height__c, acbox__Action_Document__r.acbox__Document_Width__c,' +
      ' acbox__Action_Document__r.Name,  acbox__Action_Document__r.Documents_Category__c, acbox__Action_Document__r.acbox__Allow_Image_Crop_Feature__c, acbox__Action_Document__r.Accepted_Extensions__c,' +
      ' acbox__Action_Document__r.acbox__Document_Size__c, acbox__Action_Document__r.acbox__Is_Required__c, acbox__Action_Document__r.acbox__Generated__c' +
      ' FROM acbox__Request_Document__c WHERE Name Like \'%Personal Photo%\' and acbox__Record_Id__c=' +
      '\'' +
      requestID +
      '\' limit 1';

    List<acbox__Request_Document__c> reqDocList = Database.query(query);
    acbox__Request_Document__c reqDoc = reqDocList[0];
    reqDocWrapper.Id = reqDoc.Id;
    reqDocWrapper.Status = reqDoc.acbox__Status__c;
    reqDocWrapper.Name = reqDoc.Document_Reference__c;
    reqDocWrapper.Description = reqDoc.acbox__Description__c;
    reqDocWrapper.docLongDescription = reqDoc.acbox__Action_Document__r.acbox__Long_Description__c;
    reqDocWrapper.ChildObjectTaskFieldAPI = reqDoc.acbox__Action_Document__r.acbox__Action_template__r.acbox__Child_Object_Task_Field_API__c;
    reqDocWrapper.AllowonlyJPEGupload = reqDoc.acbox__Action_Document__r.acbox__Allow_only_JPEG_upload__c;
    reqDocWrapper.DocumentHeight = reqDoc.acbox__Action_Document__r.acbox__Document_Height__c;
    reqDocWrapper.DocumentWidth = reqDoc.acbox__Action_Document__r.acbox__Document_Width__c;
    reqDocWrapper.AllowImageCropFeature = reqDoc.acbox__Action_Document__r.acbox__Allow_Image_Crop_Feature__c;
    reqDocWrapper.FileDocumentSF18 = reqDoc.acbox__File_Document_SF_18__c;
    reqDocWrapper.AcceptedExtensions = reqDoc.acbox__Action_Document__r.Accepted_Extensions__c;
    reqDocWrapper.DocumentSize = reqDoc.acbox__Action_Document__r.acbox__Document_Size__c;
    reqDocWrapper.DocumentOrder = Integer.valueOf(reqDoc.acbox__Action_Document__r.acbox__Order__c);
    reqDocWrapper.isGenerated = reqDoc.acbox__Action_Document__r.acbox__Generated__c;
    reqDocWrapper.isRequired = reqDoc.acbox__Action_Document__r.acbox__Is_Required__c;
    reqDocWrapper.DocumentsCategory = reqDoc.acbox__Action_Document__r.Documents_Category__c;
    reqDocWrapper.serviceRequestId = reqDoc.acbox__Record_Id__c;
    return reqDocWrapper;
  }

  @AuraEnabled
  public static List<ActionRequestDocumentWrapper> getRequestDocuments(String requestId, String cmd) {
    ActionRequestDocumentWrapper reqDocWrapper;
    List<ActionRequestDocumentWrapper> reqDocWrapperList = new List<ActionRequestDocumentWrapper>();

    try {
      //   ds_PortalUBOApplicationService.documentInsertion(requestId);
    } catch (exception e) {
    }
    String querySRObj = 'Select Action_template__r.Custom_Order__c ';
    String objName = ID.valueOf(requestId).getSObjectType().getDescribe().getName();
    if (objName.equalsIgnoreCase('freezone_request__c')) {
      querySRObj += ', Applicant_First_Name__c, Applicant_Last_Name__c';
    }
    querySRObj += ' From ' + objName;
    querySRObj += ' Where Id=:requestId';
    List<sObject> atList = Database.query(querySRObj);
    String query =
      'SELECT Id,Re_upload_in_Progress__c, Activity_Code__c,Document_Reference__c, acbox__View__c,QR_Code__c,Name, acbox__Description__c,acbox__Status__c, acbox__File_Document_SF_18__c, acbox__Action_Document__r.acbox__Order__c, ' +
      ' acbox__Action_Document__r.acbox__Action_template__r.acbox__Child_Object_Task_Field_API__c, acbox__Action_Document__r.acbox__Action_template__r.Show_Generated_Template_Doc_Section__c, ' +
      ' acbox__Action_Document__r.acbox__Long_Description__c, acbox__Action_Document__r.acbox__Allow_only_JPEG_upload__c, acbox__Action_Document__r.acbox__Document_Height__c, acbox__Action_Document__r.acbox__Document_Width__c,' +
      ' acbox__Action_Document__r.Name,  acbox__Action_Document__r.Documents_Category__c, acbox__Action_Document__r.acbox__Allow_Image_Crop_Feature__c,acbox__Action_Document__r.Template_Link__c, acbox__Action_Document__r.Accepted_Extensions__c,' +
      ' acbox__Action_Document__r.acbox__Document_Size__c, acbox__Action_Document__r.acbox__Is_Required__c, acbox__Action_Document__r.acbox__Generated__c' +
      ',acbox__Action_Document__r.Document_Group__c, acbox__Action_Document__r.acbox__Unique_Key__c '+
      ' FROM acbox__Request_Document__c WHERE (Id=:requestId OR acbox__Record_Id__c =:requestId) and acbox__Record_Id__c != null';

    if(String.isNotBlank(cmd) && cmd.equalsIgnoreCase('requiredAction')) {
      query += ' and (acbox__Status__c=' + DS_Commonutility.escapeString('Pending') + ' OR acbox__Status__c=' + DS_Commonutility.escapeString('Re-upload') + 'OR Re_upload_in_Progress__c = true)';
    } 
    if (!atList.isEmpty() && (Boolean) atList[0].getSObject('Action_template__r').get('Custom_Order__c')) {
      query += ' ORDER BY createdDate ASC';
    } else {
      query += ' ORDER BY acbox__Action_Document__r.acbox__Order__c ASC';
    }

    system.debug(query);
    List<acbox__Request_Document__c> reqDocList = Database.query(query);
    for (acbox__Request_Document__c reqDoc : reqDocList) {
      reqDocWrapper = new ActionRequestDocumentWrapper();
      reqDocWrapper.Id = reqDoc.Id;
      reqDocWrapper.Status = reqDoc.acbox__Status__c;
      reqDocWrapper.Name = reqDoc.Document_Reference__c;
      reqDocWrapper.Description = reqDoc.acbox__Description__c;
      reqDocWrapper.docLongDescription = reqDoc.acbox__Action_Document__r.acbox__Long_Description__c;
      reqDocWrapper.ChildObjectTaskFieldAPI = reqDoc.acbox__Action_Document__r.acbox__Action_template__r.acbox__Child_Object_Task_Field_API__c;
      reqDocWrapper.AllowonlyJPEGupload = reqDoc.acbox__Action_Document__r.acbox__Allow_only_JPEG_upload__c;
      reqDocWrapper.DocumentHeight = reqDoc.acbox__Action_Document__r.acbox__Document_Height__c;
      reqDocWrapper.DocumentWidth = reqDoc.acbox__Action_Document__r.acbox__Document_Width__c;
      reqDocWrapper.AllowImageCropFeature = reqDoc.acbox__Action_Document__r.acbox__Allow_Image_Crop_Feature__c;
      reqDocWrapper.FileDocumentSF18 = reqDoc.acbox__File_Document_SF_18__c;
      reqDocWrapper.AcceptedExtensions = reqDoc.acbox__Action_Document__r.Accepted_Extensions__c;
      reqDocWrapper.DocumentSize = reqDoc.acbox__Action_Document__r.acbox__Document_Size__c;
      reqDocWrapper.DocumentOrder = Integer.valueOf(reqDoc.acbox__Action_Document__r.acbox__Order__c);
      reqDocWrapper.isGenerated = reqDoc.acbox__Action_Document__r.acbox__Generated__c;
      reqDocWrapper.isRequired = reqDoc.acbox__Action_Document__r.acbox__Is_Required__c;
      reqDocWrapper.DocumentsCategory = reqDoc.acbox__Action_Document__r.Documents_Category__c;
      reqDocWrapper.reuploadInProgress = reqDoc.Re_upload_in_Progress__c;
      reqDocWrapper.EpassDocumentsGroup = reqDoc.acbox__Action_Document__r.Document_Group__c;
      reqDocWrapper.UniqueCode = reqDoc.acbox__Action_Document__r.acbox__Unique_Key__c;
      reqDocWrapper.restrctDocPerUser = objName.equalsIgnoreCase('freezone_request__c') &&
        !atList.isEmpty() &&
        atList[0].get('Applicant_First_Name__c') != null
        ? String.valueOf(atList[0].get('Applicant_First_Name__c')) + ' ' + String.valueOf(atList[0].get('Applicant_Last_Name__c'))
        : '';
      reqDocWrapper.showGeneratedTemplateDocSection = reqDoc.acbox__Action_Document__r.acbox__Action_template__r.Show_Generated_Template_Doc_Section__c;
      reqDocWrapper.showTemplatePreview = reqDoc.acbox__Action_Document__r.Template_Link__c;
      reqDocWrapper.showView = reqDoc.acbox__View__c;
      reqDocWrapper.activityCode = reqDoc.Activity_Code__c;
      reqDocWrapperList.add(reqDocWrapper);
    }

    reqDocWrapperList?.sort();
    return reqDocWrapperList;
  }

   @AuraEnabled
  public static string createNewDocuments(string requestId,string requestDocName,string requestDocDescription){
    String sObjName = ID.valueOf(requestId).getSObjectType().getDescribe().getName();
    
    String querySRObj = 'Select Action_Template__c FROM '+ sObjName;
    querySRObj+= ' WHERE id=:requestId limit 1';
    
    sObject serviceRequests = Database.query(querySRObj);
    string actionTemplateId = String.valueOf(serviceRequests.get('Action_Template__c'));
     acbox__Action_Document__c additionalDocTemplate = [
          SELECT id
          FROM acbox__Action_Document__c
          WHERE acbox__Action_template__c = :actionTemplateId AND acbox__Unique_Key__c LIKE '%Supporting documents%'
        ];
          acbox__Request_Document__c additionalDoc = new acbox__Request_Document__c();
          additionalDoc.acbox__Record_Id__c = requestId;
          additionalDoc.acbox__Status__c = 'Pending';
          additionalDoc.acbox__Description__c = requestDocDescription;
          additionalDoc.acbox__Active__c = true;
          additionalDoc.put(sObjName,requestId);
          //additionalDoc.Dispute_Request__c = requestId;
          additionalDoc.acbox__Action_Document__c = additionalDocTemplate.id;
          additionalDoc.Name = requestDocName;
          upsert as system additionalDoc;
          return additionalDoc.id;
      
  }

  public class ActionRequestDocumentWrapper implements Comparable {
    @AuraEnabled
    public String Id { get; set; }
    @AuraEnabled
    public String Status { get; set; }
    @AuraEnabled
    public String Name { get; set; }
    @AuraEnabled
    public String Description { get; set; }
    @AuraEnabled
    public String ChildObjectTaskFieldAPI { get; set; }
    @AuraEnabled
    public Boolean AllowonlyJPEGupload { get; set; }
    @AuraEnabled
    public Decimal DocumentHeight { get; set; }
    @AuraEnabled
    public Decimal DocumentWidth { get; set; }
    @AuraEnabled
    public Boolean AllowImageCropFeature { get; set; }
    @AuraEnabled
    public String FileDocumentSF18 { get; set; }
    @AuraEnabled
    public String AcceptedExtensions { get; set; }
    @AuraEnabled
    public Decimal DocumentSize { get; set; }
    @AuraEnabled
    public Integer DocumentOrder { get; set; }
    @AuraEnabled
    public Boolean isGenerated { get; set; }
    @AuraEnabled
    public Boolean isRequired { get; set; }
    @AuraEnabled
    public String docLongDescription { get; set; }
    @AuraEnabled
    public String DocumentsCategory { get; set; }
    @AuraEnabled
    public String serviceRequestId { get; set; }
    @AuraEnabled
    public String restrctDocPerUser { get; set; }
    @AuraEnabled
    public Boolean showGeneratedTemplateDocSection { get; set; }
    @AuraEnabled
    public String showTemplatePreview { get; set; }
    @AuraEnabled
    public String showView { get; set; }
    @AuraEnabled
    public String activityCode { get; set; }
    @AuraEnabled
    public Boolean reuploadInProgress { get; set; }
    
    @AuraEnabled
    public String EpassDocumentsGroup { get; set; }
    @AuraEnabled
    public String UniqueCode { get; set; }
    

    public Integer compareTo(Object compareTo) {
      ActionRequestDocumentWrapper compareToDoc = (ActionRequestDocumentWrapper) compareTo;
      // The return value of 0 indicates that both elements are equal.
      Integer returnValue = 0;
      if ((DocumentOrder == null) && (compareToDoc.DocumentOrder == null)) {
        // both wrappers have null Amounts
        returnValue = 0;
      } else if ((DocumentOrder == null) && (compareToDoc.DocumentOrder != null)) {
        // nulls-first implementation
        returnValue = -1;
      } else if ((DocumentOrder != null) && (compareToDoc.DocumentOrder == null)) {
        // nulls-first implementation
        returnValue = 1;
      } else if (DocumentOrder > compareToDoc.DocumentOrder) {
        // Set return value to a positive value.
        returnValue = 1;
      } else if (DocumentOrder < compareToDoc.DocumentOrder) {
        // Set return value to a negative value.
        returnValue = -1;
      }
      return returnValue;
    }
  }
  // Added by Sai kumar Reddy - Start
  /*  @AuraEnabled
    public static List<OB_Amendment__c> getAmmendmentRecords (String requestId) {

        List<OB_Amendment__c> onbAmmList = new List<OB_Amendment__c>();
        OB_Amendment__c obmAmm;
        for(OB_Amendment__c Ob: [SELECT Id,Full_Name__c,Name,Role__c,Passport_Number__c,Owner_Type__c,Trade_License_Number__c,Document_Link__c,(SELECT Id, Name FROM Attachments ORDER BY CreatedDate DESC LIMIT 1) FROM OB_Amendment__c WHERE Onboard_Request__c = :requestId and Onboard_Request__r.Action_Template__r.acbox__Unique_Code__c='CompanyRegistration'])
        {
            onbAmmList.add(Ob);
        }
        return onbAmmList;
    }
    @AuraEnabled
    public static List<OB_Amendment__c> getGeneralAmmendmentRecords (String requestId) {
        List<OB_Amendment__c> onbAmmList = new List<OB_Amendment__c>();
        OB_Amendment__c obmAmm;
        for(OB_Amendment__c Ob: [SELECT Id,Full_Name__c,Name,Role__c,Passport_Number__c,Status__c,Owner_Type__c,Trade_License_Number__c,Document_Link__c,(SELECT Id, Name FROM Attachments ORDER BY CreatedDate DESC LIMIT 1) FROM OB_Amendment__c WHERE Onboard_Request__c = :requestId and Onboard_Request__r.Action_Template__r.acbox__Unique_Code__c='AddorRemoveDirector'])
        {
            onbAmmList.add(Ob);
        }
        return onbAmmList;
    } */
  // Added by Sai kumar Reddy - End
  @AuraEnabled
  public static List<RequestDocument> getUploadedDocumentDetails(String requestId) {
    List<RequestDocument> docList = new List<RequestDocument>();
    RequestDocument docListWithRedirectionCmp = new RequestDocument();
    RequestDocument doc;
    for (acbox__Request_Document__c rDoc : [
      SELECT Id, acbox__Record_Id__c, acbox__Status__c, acbox__File_Document_SF_18__c, acbox__Action_Document__r.Redirect_component__c, Name, Document_Reference__c, acbox__Is_Generated__c
      /* ,OB_Amendment__c */
      FROM acbox__Request_Document__c
      WHERE acbox__Record_Id__c = :requestId AND acbox__Status__c != 'Pending' AND acbox__Action_Document__r.Is_FZ_Internal_NOC__c = false AND DocuSign_Evidence__c = false
      ORDER BY acbox__Action_Document__r.acbox__Order__c ASC
    ]) {
      doc = new RequestDocument();
      doc.Id = rDoc.Id;
      doc.Record_Id = rDoc.acbox__Record_Id__c;
      doc.File_Document_SF_18 = rDoc.acbox__File_Document_SF_18__c;
      doc.Name = rDoc.Document_Reference__c;
      doc.Is_Generated = rDoc.acbox__Is_Generated__c;
      doc.Status = rDoc.acbox__Status__c;
      /*  if(rDoc.OB_Amendment__c==null){
                doc.Is_Onboarding =true;
            } */
      if (String.isBlank(rDoc.acbox__Action_Document__r.Redirect_component__c)) {
        docList.add(doc);
        system.debug('doc+++' + doc);
      } else {
        doc.Redirect_component = rDoc.acbox__Action_Document__r.Redirect_component__c;
        docListWithRedirectionCmp = doc;
      }
    }
    if (String.isNotBlank(docListWithRedirectionCmp.Record_Id)) {
      String query = 'select {0} from {1} where {2}={3}';
      String fileObjName = ID.valueOf(docListWithRedirectionCmp.Record_Id).getSObjectType().getDescribe().getName();
      if (fileObjName == 'freezone_request__c') {
        LIST<Object> params = new List<Object>{
          DS_Commonutility.convertFieldListToString(new List<string>{ 'Id', 'Card_Management__c' }),
          fileObjName,
          'id',
          DS_Commonutility.escapeString(docListWithRedirectionCmp.Record_Id)
        };
        system.debug('+++11' + String.format(query, params));
        List<freezone_request__c> cardList = Database.query(String.format(query, params));
        docListWithRedirectionCmp.Redirect_component += cardList[0].get('Card_Management__c');
      } else {
        LIST<Object> params = new List<Object>{
          DS_Commonutility.convertFieldListToString(new List<string>{ 'Id', fileObjName }),
          'Card_Management__c',
          fileObjName,
          DS_Commonutility.escapeString(docListWithRedirectionCmp.Record_Id)
        };
        List<Card_Management__c> cardList = Database.query(String.format(query, params));
        docListWithRedirectionCmp.Redirect_component += cardList[0].Id;
      }
      docList.add(docListWithRedirectionCmp);
    }
    return docList;
  }

  public class RequestDocument {
    @AuraEnabled
    public Id Id { get; set; }
    @AuraEnabled
    public String Name { get; set; }
    @AuraEnabled
    public String Status { get; set; } 
    @AuraEnabled
    public String Record_Id { get; set; }
    @AuraEnabled
    public String File_Document_SF_18 { get; set; }
    @AuraEnabled
    public String Redirect_component { get; set; }
    @AuraEnabled
    public String Redirect_component_parameter { get; set; }
    @AuraEnabled
    public Boolean Is_Generated { get; set; }
    @AuraEnabled
    public Boolean Is_Onboarding { get; set; }
  }

  @AuraEnabled
  public static sObject getRequest(String requestId) {
    List<Object> params;
    String objName = ID.valueOf(requestId).getSObjectType().getDescribe().getName();
    String query = 'Select {0} from {1} where {2} = {3}';
    params = new List<Object>{
      DS_Commonutility.convertFieldListToString(new List<string>{ 'Id', 'Name', 'Status__c', 'Customer_Transactions__c', 'Account_Name__c' }),
      objName,
      'Id',
      DS_Commonutility.escapeString(requestId)
    };
    return Database.query(String.format(query, params))[0];
  }

  @AuraEnabled
  public static priceInfoWrapper getPriceList(String requestId) {
    String objName = ID.valueOf(requestId).getSObjectType().getDescribe().getName();
    if (objName.equalsIgnoreCase('Licensing_Request__c')) {
      List<Licensing_Request__c> licList = [
        SELECT
          id,
          Status__c,
          Action_Template__c,
          Action_Template__r.acbox__Unique_Code__c,
          Account_Name__c,Account_Name__r.Current_License_Number__r.License_Type__c,
          Account_Name__r.Current_License_Number__c
        FROM Licensing_Request__c
        WHERE Id = :requestId
      ];
      if (licList !=null && !licList.isEmpty() && licList[0].Status__c =='Draft') {
        RegistrationAmendmentActions.processLicensingPrice(licList[0]);
      }
    } 
    if (objName.equalsIgnoreCase('Onboard_Request__c')) {
      List<Onboard_Request__c> onbList = [
        SELECT
          id,
          Status__c,
          Action_Template__c,
          Action_Template__r.acbox__Unique_Code__c,
          Account_Name__c,Account_Name__r.Current_License_Number__r.License_Type__c,
          Account_Name__r.Current_License_Number__c
          FROM Onboard_Request__c
          WHERE Id = :requestId
      ];
      if (onbList !=null && !onbList.isEmpty() && onbList[0].Status__c =='Draft') {
        ds_LicensePortalRequest.processOnboardingPrice(onbList[0]);
      }
    } 
    if (objName.equalsIgnoreCase('freezone_request__c')) {
      List<freezone_request__c> lstFrz = [
        SELECT Visa__c,id, Action_Template_Unique_Code__c, Short_Term_Visa_Quota__c, Short_Term_Visa__c, Long_Term_Visa__c, Long_Term_Visa_Quota__c
        FROM freezone_request__c
        WHERE id = :requestId
      ];
      if (!lstFrz.isEmpty() && lstFrz[0].Action_Template_Unique_Code__c == 'VisitVisaFileOpening') {
        updatePayment(lstFrz[0]);
      }
        if (!lstFrz.isEmpty() && lstFrz[0].Action_Template_Unique_Code__c == 'Entry_Permit_Cancellation') {
            BizFlow_PermitCancellation inst = new BizFlow_PermitCancellation();
            inst.processData(lstFrz[0], '');
        }
        
        if (!lstFrz.isEmpty() && lstFrz[0].Action_Template_Unique_Code__c == 'ReturnPermit') {
            BizFlow_ReEntryCalculations inst = new BizFlow_ReEntryCalculations();
            inst.processData(lstFrz[0], '');
        }
        
    }
    priceInfoWrapper piw = new priceInfoWrapper();
    Decimal totalPayableAmount = 0.00;

    // Get List of Request Prices for the Service Request.
    List<acbox__Request_Price__c> listOfPrice = new List<acbox__Request_Price__c>();
   /* listOfPrice = [
      SELECT Id, acbox__Action_Price__r.acbox__Action_Template__r.Pre_Check_Rule_Criteria__c, Name, acbox__Description__c, acbox__Order__c, acbox__Price__c, Total__c, Vat_Cal__c, Quantity__c
      FROM acbox__Request_Price__c
      WHERE acbox__Record_Id__c = :requestId
      ORDER BY Createddate DESC
    ];*/
    if (objName.equalsIgnoreCase('Onboard_Request__c')) {
      listOfPrice = [
        SELECT Id,Onboard_Request__c,acbox__Status__c,acbox__Action_Price__r.acbox__Action_Template__r.Pre_Check_Rule_Criteria__c, acbox__Action_Price__r.acbox__Action_Template__r.acbox__Unique_Code__c,Name, acbox__Description__c, acbox__Order__c, acbox__Price__c, Total__c, Vat_Cal__c, Quantity__c
        FROM acbox__Request_Price__c
        WHERE acbox__Record_Id__c = :requestId //AND Name !='Initial Approval Application Fee - Freelancer' 
        ORDER BY acbox__Action_Price__r.acbox__Price__c DESC
      ];
    } else if(objName.equalsIgnoreCase('Licensing_Request__c')){
      listOfPrice = [
        SELECT Id,acbox__Status__c, acbox__Action_Price__r.acbox__Action_Template__r.Pre_Check_Rule_Criteria__c, acbox__Action_Price__r.acbox__Action_Template__r.acbox__Unique_Code__c,Name, acbox__Description__c, acbox__Order__c, acbox__Price__c, Total__c, Vat_Cal__c, Quantity__c
        FROM acbox__Request_Price__c
        WHERE acbox__Record_Id__c = :requestId
        ORDER BY acbox__Action_Price__r.acbox__Order__c
      ];
    } else {
      listOfPrice = [
        SELECT Id,acbox__Status__c, acbox__Action_Price__r.acbox__Action_Template__r.Pre_Check_Rule_Criteria__c, acbox__Action_Price__r.acbox__Action_Template__r.acbox__Unique_Code__c, Name, acbox__Description__c, acbox__Order__c, acbox__Price__c, Total__c, Vat_Cal__c, Quantity__c
        FROM acbox__Request_Price__c
        WHERE acbox__Record_Id__c = :requestId
        ORDER BY acbox__Order__c ASC
      ];
    }

    //Get the total Payable amount for every price list.
    if (listOfPrice != null && listOfPrice.size() > 0) {
      for(acbox__Request_Price__c price : listOfPrice) {
        //Added by Vinod for Company Registration to show only Added Status requets fees
        if(objName.equalsIgnoreCase('Onboard_Request__c')){
          if(price.acbox__Status__c == 'Added'){
            totalPayableAmount = totalPayableAmount + price.Total__c;
          }
        } else if(objName.equalsIgnoreCase('Licensing_Request__c')){
          if(price.acbox__Action_Price__r.acbox__Action_Template__r.acbox__Unique_Code__c !='FreelancerRegistration' || (price.acbox__Status__c == 'Invoiced' && price.acbox__Action_Price__r.acbox__Action_Template__r.acbox__Unique_Code__c =='FreelancerRegistration')){
            totalPayableAmount = totalPayableAmount + price.Total__c;
          }
          
        } else{
          totalPayableAmount = totalPayableAmount + price.Total__c;
        }
      }
    }

    //Get Logged-In user Account Portal Wallet Balance.
    User userDetails = DS_Commonutility.getCurrentUserInfo();
    Decimal walletBalance = DS_Commonutility.getPortalUserAccountWalletBalance(userDetails.Account_Id__c);

    piw.priceList = listOfPrice;
    piw.walletBalance = walletBalance;
    piw.totalPayableAmount = totalPayableAmount;

    return piw;
  }
 
   //Created by Vinod
   
/*commented by manoj
    @AuraEnabled
   public static void createInvoice(String requestId){
      ds_OnboardPortalRequest.createInvoice(requestId);
   } 
   @AuraEnabled
    public static InvoiceInfoWrapper getInvoiceList(string requestId){
        InvoiceInfoWrapper wrapper = new InvoiceInfoWrapper();
        List<Invoice__c> invoiceList = [SELECT Id,Name, Amount__c,Description__c,Due_Date__c,Status__c,Service_Name__c,(SELECT Id FROM Attachments) FROM Invoice__c WHERE Onboard_Request__c=:requestId LIMIT 1];
        List<Attachment> invoiceAttachments = [Select Id FROM Attachment WHERE ParentId=:invoiceList[0].Id order by createddate DESC LIMIT 1];
        if(!invoiceAttachments.isEmpty()){
          wrapper.invoiceList = invoiceList;
          wrapper.baseURL = URL.getOrgDomainURL().toExternalForm();
          wrapper.attachmentId = invoiceAttachments[0].Id != null ? invoiceAttachments[0].Id: '';
        }
        return wrapper;
    } */
    @AuraEnabled
    public static list<InvInfoWrapper> getInvList(){
      list<User> userRecLst =  [SELECT AccountId  FROM User WHERE Id = :UserInfo.getUserId()];
      if(!userRecLst.isEmpty())
      {
          list<InvInfoWrapper> invLst = new list<InvInfoWrapper>();
          for(Invoice__c inv : [SELECT Id, Name, Received_From__c, Related_To__c, Type__c, Unique_Invoice_Name__c, Description__c,
                                  CreatedDate, DLC_Invoice_Sent_Date__c,  Amount__c, Status__c, 
                                  (Select Id From Attachments Order by CreatedDate DESC Limit 1)
                                  FROM Invoice__c
                                  WHERE Received_From__c = :userRecLst[0].AccountId AND Status__C IN ('Partially Paid', 'Posted')
                                  ORDER BY CreatedDate DESC]){
            InvInfoWrapper iw = new InvInfoWrapper();
            iw.invoice = inv;
            iw.baseURL = URL.getOrgDomainURL().toExternalForm();
            if(inv.Attachments != null && !inv.Attachments.isEmpty()){
              iw.attachmentId = inv.Attachments[0].Id;
            }
            invLst.add(iw);
          }
          if(!invLst.isEmpty()) return invLst;
      }
      return null;
    }
    @AuraEnabled
    public static string getAttachmentId(Id parentId){
      system.debug('====parentid==='+parentId);
      string attId;
      for(Attachment att : [Select id From Attachment where ParentId=:parentId Limit 1]){
        attId = att.Id;
      }
      return attId;
    }

   //Vinod changes end 
    
  @AuraEnabled
  public static priceInfoWrapper getPriceListInvoice(String requestId) {
    String objName = ID.valueOf(requestId).getSObjectType().getDescribe().getName();
    priceInfoWrapper piw = new priceInfoWrapper();
    List<Invoice_Line_Item__c> listOfPriceInv = new List<Invoice_Line_Item__c> ();
    if (objName.equalsIgnoreCase('Invoice__c')) {
        listOfPriceInv = [
        SELECT
          id,
          Name,
          Quantity__c,
          Amount__c,
          VAT__c,
          Total_with_VAT__c,
          Service_Name__c
        FROM Invoice_Line_Item__c 
        WHERE Invoice__c = :requestId
      ];

      piw.totalPayableAmount = [select id,Amount__c from invoice__c where id =: requestId limit 1].Amount__c;
    }
     
    //Get Logged-In user Account Portal Wallet Balance.
    User userDetails = DS_Commonutility.getCurrentUserInfo();
    Decimal walletBalance = DS_Commonutility.getPortalUserAccountWalletBalance(userDetails.Account_Id__c);

    piw.priceListInvoice = listOfPriceInv;
    piw.walletBalance = walletBalance;

    return piw;
  }
  @AuraEnabled
  public static ds_PortalRequestsWrapper.Response deleteUploadedDocuments(String contentDocumentId, String requestDocID) {
    ds_PortalRequestsWrapper.Response res = new ds_PortalRequestsWrapper.Response();
    try {
      ContentDocument cd = [SELECT Id FROM ContentDocument WHERE Id = :contentDocumentId];
      acbox__Request_Document__c rDoc = new acbox__Request_Document__c();
      rDoc.Id = requestDocID;
      rDoc.acbox__Status__c = 'Pending';
      rDoc.acbox__File_Document_SF_18__c = '';
      Database.DeleteResult result = Database.delete(cd);
      if (result.isSuccess()) {
        Database.SaveResult updateResult = Database.update(rDoc);
        if (updateResult.isSuccess()) {
          res.isSuccess = true;
          res.Status = 'Success';
          res.error = '';
        } else {
          // Error ds_PortalRequestsWrapper.Response
          res.isSuccess = false;
          res.Status = 'Error';
          res.error = 'Error while delete the file. Please contact Support.';
          System.debug('Error deleting record: ' + updateResult.getErrors()[0].getMessage());
        }
      } else {
        // Error ds_PortalRequestsWrapper.Response
        res.isSuccess = false;
        res.Status = 'Error';
        res.error = 'Error while delete the file. Please contact Support.';
        System.debug('Error deleting record: ' + result.getErrors()[0].getMessage());
      }
    } catch (DmlException e) {
      res.isSuccess = false;
      res.Status = 'Error';
      res.recId = '';
      res.error = res.error = 'Error while delete the file. Please contact Support.';
      System.debug('Error deleting record: ' + e.getMessage());
    }
    return res;
  }

  @AuraEnabled
  public static string sharePaymentLink(String requestId, String requestName, String objName, String email) {
    String message = '';
    String paymentURL = system.Label.DSPortalSharePaymentLinkURL + '?requestId=' + requestId + '&objName=' + objName;
    String emailSubject = 'Shared Payment Link for ' + requestName;
    String emailBody =
      '<p>Hi,</p><br>' +
      '<p>Payment link has been shared with you for the request ' +
      requestName +
      '.</p>' +
      '<p>Click on the <a href="' +
      paymentURL +
      '">link</a> to start the payment</p>';

    Messaging.SingleEmailMessage mail = new Messaging.SingleEmailMessage();
    mail.setToAddresses(new List<String>{ email });
    mail.setSubject(emailSubject);
    mail.setHtmlBody(emailBody);
    Messaging.SendEmailResult[] sendResults = Messaging.sendEmail(new List<Messaging.SingleEmailMessage>{ mail });

    if (sendResults[0].isSuccess()) {
      message = 'success';
      System.debug('Email sent successfully!');
    } else {
      message = 'Error::' + sendResults[0].getErrors()[0].getMessage();
      System.debug('Failed to send email: ' + sendResults[0].getErrors()[0].getMessage());
    }

    return message;
  }

  // Method to do Request Payment via Portal Balance from Customer Wallet
  // Added tolalValueObjects logic by G SAI KUMAR REDDY for taking total amount for specific department on 05/06/2024 
 
  @AuraEnabled
  public static string doPaymentFromWallet(String requestId, String objName, String requestName, String accountId, String customerTransactionId) {
    string message = '';
    
    List<String> tolalValueObjects = new List<String>{'logistics_request__c','onboard_request__c','licensing_request__c'}; //always put object in lower case 
    if (string.isnotBlank(requestId)) {
      try {
        Decimal WithoutVatRequestFee = 0.00;
        Decimal requestFee = 0.00;
        List<sObject> listToUpsert = new List<sObject>();
        List<acbox__Request_Price__c> listOfPrices = new List<acbox__Request_Price__c>();
        if(objName == 'onboard_request__c'){
            listOfPrices = [
            SELECT Id, Name, acbox__Status__c, Total__c, acbox__Price__c, Vat_Cal__c
            FROM acbox__Request_Price__c
            WHERE acbox__Record_Id__c = :requestId and acbox__Status__c = 'Added'
          ];

        }else{
            listOfPrices = [
            SELECT Id, Name, acbox__Status__c, Total__c, acbox__Price__c, Vat_Cal__c
            FROM acbox__Request_Price__c
            WHERE acbox__Record_Id__c = :requestId
          ];

        }

        if (listOfPrices != null && listOfPrices.size() > 0) {
          for (acbox__Request_Price__c rp : listOfPrices) {
            WithoutVatRequestFee += rp.acbox__Price__c;
            if(tolalValueObjects.contains(objName.toLowerCase())){
              requestFee += rp.Total__c;              
            }else{
              requestFee += rp.acbox__Price__c;
            }
            requestFee += rp.Vat_Cal__c;
            rp.acbox__Status__c = 'Blocked';
            listToUpsert.add(rp);
          }
        }
        Decimal portalBalance = DS_Commonutility.getPortalUserAccountWalletBalance(accountId);
        listToUpsert.add(getCustomerTransactionRecord(customerTransactionId, requestId, requestName, 'Blocked', requestFee, accountId, 'Debit', objName, portalBalance, 'Wallet'));
        sObject requestObject = Schema.getGlobalDescribe().get(Id.valueOf(requestId).getSObjectType().getDescribe().getName()).newSObject();
        requestObject.id = requestId;
        if (String.isBlank(customerTransactionId)) {
          Free_Zone_Payment__c customerDebitTransaction = new Free_Zone_Payment__c(Request_Record_Id__c = 'Debit' + requestId);
          requestObject.putSObject('Customer_Transactions__r', customerDebitTransaction);
        } else {
          requestObject.put('Customer_Transactions__c', customerTransactionId);
        }
        listToUpsert.add(requestObject);

        if (!listToUpsert.isEmpty()) {
          upsert listToUpsert;
          message = 'success';
        }
      } catch (Exception e) {
        message = 'Error:: ' + e.getMessage();
        Email_Utility.sendSingleEmail(Label.ExceptionEmailAddress,'Exception occurs while processing Wallet Payment from method: doPaymentFromWallet','--Exception Message:'+e.getMessage()+'--LineNumber:'+e.getLineNumber()+'--Exception:'+e.getStackTraceString()) ;
        
        
      }
    }
    return message;
  }

  public static Free_Zone_Payment__c getCustomerTransactionRecord(
    String customerTransactionId,
    String requestId,
    String requestName,
    String status,
    Decimal amount,
    String accountId,
    String transactionType,
    string ObjName,
    Decimal portalBalance,
    String NoqodiPaymentMode
  ) {
    String requestType = '';
    String applicantName = '';
    if (ObjName == 'Portal_Topup_Request__c') {
      requestType = 'Wallet Recharge';
    } else if(ObjName == 'Invoice__c'){
      requestType = 'Wallet Debit';

    } else {
      SObject serviceRequest = Database.query('SELECT Id,Name,Request_Type__c,Applicant_Full_Name__c FROM ' + objName + ' WHERE Id = :requestId');
      requestType = (String) serviceRequest.get('Request_Type__c');
      requestName = String.isNotBlank(requestName) ? requestName : (String) serviceRequest.get('Name');
      applicantName = (String) serviceRequest.get('Applicant_Full_Name__c');
    }

    Free_Zone_Payment__c ct = new Free_Zone_Payment__c();
    ct.put(ObjName, requestId);
    ct.Free_Zone_Customer__c = accountId;
    ct.Transaction_Date__c = Datetime.now();
    ct.Paypal_Amount__c = amount;
    ct.Revamp__c = true;
    ct.Opening_Balance__c = portalBalance;
    ct.Effect_on_Account__c = transactionType;
    ct.Status__c = status;
    ct.Created_By__c = UserInfo.getUserId();
    ct.RecordTypeId = Schema.SObjectType.Free_Zone_Payment__c.getRecordTypeInfosByDeveloperName().get('Portal_Transactions').getRecordTypeId();
    ct.Request_Record_Id__c = transactionType + requestId;
    ct.Payment_Mode__c = NoqodiPaymentMode;
    if (NoqodiPaymentMode == 'Wallet') {
      ct.Payment_Type__c = 'Account Balance';
      ct.Description__c = 'Portal Deduction: ' + requestType + ', Reference Number: ' + requestName;
    } else {
      ct.Payment_Type__c = 'Noqodi';
      ct.Description__c = 'Online Payment: ' + requestType + ', Reference Number: ' + requestName;
    }
    if(!string.isblank(applicantName)){
      ct.Description__c = ct.Description__c +', '+applicantName;
    }
    if (transactionType == 'Debit') {
      ct.Closing_Balance__c = portalBalance - amount;
    } else if (transactionType == 'Credit') {
      ct.Closing_Balance__c = portalBalance + amount;
      ct.Transaction_Type__c = 'Top-Up';
    }
    if (String.isNotBlank(customerTransactionId)) {
      ct.ID = customerTransactionId;
    }
    return ct;
  }

  // Method to Start Noqodi Payment Process : Start Pre authorizaing and redirect to Noqodi payment page
  @AuraEnabled
  public static noqodiWrapper startNoqodiPayment(String requestId, String objName) {
    noqodiWrapper noqodiwrap = new noqodiWrapper();

    if (!string.isblank(requestId)) {
      String query = 'SELECT Id,name,Noqodi_Transaction_Status__c from ' + objName + ' where Id =: requestId';
      system.debug('Query::' + query);
      List<SObject> listOfRequests = Database.query(query);
      system.debug('listOfRequests::' + listOfRequests);

      if (listOfRequests != null && listOfRequests.size() > 0) {
        SObject serviceReq = listOfRequests[0];
        String NoqodiTransactionStatus = (String) serviceReq.get('Noqodi_Transaction_Status__c');

        if (NoqodiTransactionStatus == 'Authorized' || NoqodiTransactionStatus == 'Not Captured' || NoqodiTransactionStatus == 'Pending' || NoqodiTransactionStatus == 'Initiated') {
          noqodiwrap.preAuthResponse = 'Payment already in process. Please check after some time.';
          return noqodiwrap;
        } else
          noqodiwrap.preAuthURL = ds_PortalNoqodiUtilityClass.processPaymentPreAuthRequest(requestId, objName);
      }
    }
    system.debug('noqodiwrap.preAuthURL::' + noqodiwrap.preAuthURL);
    system.debug('noqodiwrap::' + noqodiwrap);
    return noqodiwrap;
  }

  // Read payment response from Noqodi
  @AuraEnabled
  public static ds_PortalNoqodiUtilityClass.captureResponseWrapper authorizePayment(String response) {
    String message = '';
    ds_PortalNoqodiUtilityClass.paymentAuthWrapper authwrapper = new ds_PortalNoqodiUtilityClass.paymentAuthWrapper();
    ds_PortalNoqodiUtilityClass.captureResponseWrapper capturewrapper = new ds_PortalNoqodiUtilityClass.captureResponseWrapper();

    if (!string.isBlank(response)) {
      authwrapper = ds_PortalNoqodiUtilityClass.authorizePayment(response);
      system.debug('==authwrapper==='+authwrapper);
      // After the authorization is done, Capture the payment.
      if (String.isblank(authwrapper.errorMessage)) {
        if (!string.isBlank(authwrapper.requestId) && !string.isBlank(authwrapper.objName) && authwrapper.reqRecord != null) {
          capturewrapper = ds_PortalNoqodiUtilityClass.capturePayment(authwrapper.requestId, authwrapper.objName, authwrapper.reqRecord, '');
        }
      } else {
        update authwrapper.reqRecord;
        GenericLogUtility.createNoqodiLogs();

        capturewrapper.isSuccess = false;
        capturewrapper.message = authwrapper.errorMessage;
        capturewrapper.reqNumber = (String) authwrapper.reqRecord.get('Name');
        if (authwrapper.objName == 'Portal_Topup_Request__c') {
          capturewrapper.isTopup = true;
        } else {
          capturewrapper.isTopup = false;
        }
      }
    } else {
      capturewrapper.isSuccess = false;
      capturewrapper.message = 'No authentication response received from Noqodi.';
    }
    return capturewrapper;
  }

  //Generic method to get main Service from Request Prices
  public static acbox__Request_Price__c getMainServicePriceRecord(String requestId) {
    acbox__Request_Price__c ap;
    for (acbox__Request_Price__c tempap : [
      SELECT
        Id,
        Name,
        acbox__Status__c,
        Total__c,
        acbox__Price__c,
        Vat_Cal__c,
        acbox__Action_Price__r.eService_Administration__r.Offset_account_Noqodi_Wallet__c,
        acbox__Action_Price__r.eService_Administration__c
      FROM acbox__Request_Price__c
      WHERE acbox__Record_Id__c = :requestId AND Is_Main_Service__c = TRUE AND acbox__Action_Price__r.eService_Administration__c != NULL
      LIMIT 1
    ]) {
      ap = tempap;
    }
    return ap;
  }
  
  // Wrapper class to store Noqodi redirection details
  public class noqodiWrapper {
    @AuraEnabled
    public String preAuthURL;
    @AuraEnabled
    public String preAuthResponse;
  }

  //Wrapper class to fetch pricing details along with Wallet Balance for Pricing Page.
  public class priceInfoWrapper {
    @AuraEnabled
    public List<acbox__Request_Price__c> priceList;
    @AuraEnabled
    public List<Invoice_Line_Item__c> priceListInvoice;
    @AuraEnabled
    public Decimal walletBalance;
    @AuraEnabled
    public Decimal totalPayableAmount;
  }
    //Invoice Wrapper added by Vinod
    public class InvoiceInfoWrapper {
    @AuraEnabled
    public List<Invoice__c> invoiceList;
    @AuraEnabled
    public String baseURL;
    @AuraEnabled
    public String attachmentId;
  } 

  //Invoice Wrapper added by Azmath
  public class InvInfoWrapper {
    @AuraEnabled
    public Invoice__c invoice;
    @AuraEnabled
    public String baseURL;
    @AuraEnabled
    public String attachmentId;
  } 
}