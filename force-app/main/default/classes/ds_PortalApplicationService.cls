public without sharing class ds_PortalApplicationService {
    private static final String DATE_TEXT = 'Date';
    
    
    private static final String DATETIME_TEXT = 'Date/Time';
    private static final String NUMBER_TEXT = 'Number';
    private static final String CURRENCY_TEXT = 'Currency';
    private static final String PICKLIST_TEXT = 'Picklist';
    private static final String MULTIPICKLIST_TEXT = 'Multi Picklist';
    private static final String TIME_TEXT = 'Time';
    Public Static String childObjectName;
    Public Static String parentFieldName;
    
    @AuraEnabled
    public static String getSectionDetailFlowID(String actionTempId){
       List<acbox__Action_Page_Flow__c> flowList =  [select Id from acbox__Action_Page_Flow__c where  acbox__Action_Template__c=:actionTempId AND Contains_Section_Details__c = true];
       if(flowList != null && !flowList.isEmpty())
           return flowList[0].Id;
       return null;
    }

    @AuraEnabled
    public static acbox__Action_Template__c getActTemplateRecord(String actionTempId){

       List<acbox__Action_Template__c> flowList =[Select id,acbox__Object_API_Name__c,acbox__Unique_Code__c from acbox__Action_Template__c where id=:actionTempId Limit 1];
       if(flowList != null && !flowList.isEmpty())
           return flowList[0];
       return null;

    }

    public static List<acbox__Section__c> getapplicationFlowDetails(String pageFlowId){
       return [select Name,acbox__Columns__c,acbox__Rule_Criteria__c,acbox__Description__c,acbox__Header_Text__c,acbox__Action_Page_Flow__c,acbox__Type__c,
         acbox__Is_Active__c,acbox__Order__c,acbox__Render_By_Default__c,acbox__Rule_Criteria_Display__c,acbox__Show_Header__c,
         CurrencyIsoCode,(select acbox__Lookup_Field_name__c,acbox__Custom_Lookup_Object__c,acbox__Custom_Lookup_Condition__c,acbox__Label_Override__c,acbox__Section__c,acbox__Rule_Criteria__c,Name,acbox__Custom_Lookup_Picklist__c,acbox__Error_Message__c,
         acbox__On_Change_JS_Function__c,acbox__Field_API_Name__c,acbox__Has_On_Change__c,acbox__Is_Disable__c,acbox__Is_Hidden__c,acbox__Is_required__c,acbox__Object_API_Name__c,acbox__Dependent_field_API_Name__c,
         acbox__Default_Value__c,acbox__Pattern_Match__c,acbox__Order__c,acbox__Render_By_Default__c,acbox__Rule_Criteria_Display__c,acbox__Component_Type__c,CurrencyIsoCode,acbox__Field_type__c
         from acbox__Section_Details__r order by acbox__Order__c),acbox__Action_Page_Flow__r.acbox__Action_Template__c,acbox__Action_Page_Flow__r.acbox__Active__c,
         acbox__Action_Page_Flow__r.acbox__Community_Page_URL__c,acbox__Action_Page_Flow__r.acbox__Description__c,acbox__Action_Page_Flow__r.acbox__Menu_Title__c,acbox__Action_Page_Flow__r.acbox__Object_API_Name__c,acbox__Action_Page_Flow__r.acbox__Order__c,
         acbox__Action_Page_Flow__r.acbox__Render_by_Default__c,acbox__Action_Page_Flow__r.CurrencyIsoCode from acbox__Section__c where acbox__Action_Page_Flow__c=:pageFlowId 
              order by acbox__Order__c];
    }

    public static List<String> getPickListValues(String objName, String fieldName){
        SObjectType objType = Schema.getGlobalDescribe().get(objName);
        Map<String,Schema.SObjectField> mfields = objType.getDescribe().fields.getMap();
        List<String>  pickListValuesList = new List<String>();
        if(mfields.containsKey(fieldName)){
            Schema.DescribeFieldResult fieldResult = mfields.get(fieldName).getDescribe();
            if(fieldResult.getType() == Schema.DisplayType.PICKLIST || fieldResult.getType() == Schema.DisplayType.MultiPicklist){
                List<Schema.PicklistEntry> ple = fieldResult.getPicklistValues();
                for( Schema.PicklistEntry pickListVal : ple){
                    pickListValuesList.add(pickListVal.getLabel());
                }     
            }
        }
        return pickListValuesList;
    }
    public static List<String> getAllFieldsFromObject(String objectName){
       Set<String> sObjectFields = Schema.getGlobalDescribe().get(objectName).getDescribe().fields.getMap().keySet();    
       return new List<String>(sObjectFields);
    }

    @AuraEnabled
    public static Map<string,object> getFormDetailsCopy(String actionTempId, String actionPageFlowId, String srId, String empId,String userId, String nocName,string cardId,string projectId){
        Map<string,object> mapReturn=new Map<string,object> ();
        List<acbox.PageFlowFields> returnListOfSection;
        List<FormDetails> lstFormDetails = new List<FormDetails>();
        String srRecordTypeId = '';
        List<SObject> listData;  
        //List<String> serviceReqfields;
        //Set<String> SR_STATUS = new  Set<String>{'Draft'};
        //boolean renderDefault = false;  
        //Map<String,Map<String,Map<String, Set<String>>>> dependentPickListValues =  new Map<String,Map<String,Map<String, Set<String>>>>(); 
        //String className = '';
        SObject srObject;
        List<String> actionTempFieldAPIs = new List<String>();
        List<String> actionTempChildFieldAPIs = new List<String>();
        
        List<acbox__Action_Page_Flow__c> appFlow = [SELECT acbox__Action_Template__r.acbox__Unique_Code__c,acbox__Action_Template__c, acbox__Action_Template__r.acbox__Object_API_Name__c,acbox__Action_Template__r.Category__c,acbox__Action_Template__r.Menu_Text__c,acbox__Record_Type_Developer_Name__c FROM acbox__Action_Page_Flow__c WHERE  Id=:actionPageFlowId];
        if(!appFlow.isEmpty()){
            srRecordTypeId = String.isNotBlank(appFlow[0].acbox__Record_Type_Developer_Name__c) ?  
                            Schema.getGlobalDescribe().get(appFlow[0].acbox__Action_Template__r.acbox__Object_API_Name__c).getDescribe().getRecordTypeInfosByDeveloperName().get(appFlow[0].acbox__Record_Type_Developer_Name__c).getRecordTypeId()
                             : '';
           returnListOfSection = acbox.RequestFormcontroller.getSectionsAndFields(srId,appFlow[0].Id,appFlow[0].acbox__Action_Template__r.acbox__Object_API_Name__c);
           for(acbox.PageFlowFields section : returnListOfSection){
                for(acbox__Section_Detail__c sectionDetails:section.ListSectionDetail){
                    if(!section.ObjSection.acbox__Is_Child__c){
                        if(!actionTempFieldAPIs.contains(sectionDetails.acbox__Field_API_Name__c)){
                            actionTempFieldAPIs.add(sectionDetails.acbox__Field_API_Name__c);
                        }
                    }
                    else{
                         if(!actionTempChildFieldAPIs.contains(sectionDetails.acbox__Field_API_Name__c)){
                            actionTempChildFieldAPIs.add(sectionDetails.acbox__Field_API_Name__c);
                        }
                    }
                }
            } 
        }
        if(String.isBlank(srId)){
            //create service request on form load
           srObject = createSRRecord(appFlow[0],empId,userId, srRecordTypeId,nocName,cardId,projectId);
           srId = srObject?.Id;
        }else{
            //Email_Utility.sendSingleEmail(Label.ExceptionEmailAddress,'MURTAZA', 'select  Id,Name'+String.join(actionTempFieldAPIs,',') + ' from ' + appFlow[0].acbox__Action_Template__r.acbox__Object_API_Name__c + ' where Id ='+srId) ;
            actionTempFieldAPIs.addAll(new List<String>{'Name'} );
            LIST<String> params = new List<String>{ ds_SOQLLibrary.convertFieldListToString(actionTempFieldAPIs), 
                                                    appFlow[0].acbox__Action_Template__r.acbox__Object_API_Name__c, 
                                                    'ID', 
                                                    ds_SOQLLibrary.escapeString(srId)
            };
            listData = ds_SOQLLibrary.run('getSRRec',params);
            srObject = listData[0];
        } 
        lstFormDetails = getFormDetailsList(returnListOfSection, srObject);
        FormDetailsData response = new FormDetailsData(lstFormDetails, srId, null, srRecordTypeId, srObject);
        mapReturn.put('response',JSON.serialize(response));
        mapReturn.put('responseChild', getFormDetailsResponseChild(srObject, srId,actionTempChildFieldAPIs));
        mapReturn.put('templateRec',[select id,Menu_Text__c,acbox__Unique_Code__c from acbox__Action_Template__c where id=:actionTempId limit 1]);
        return mapReturn;
    }

    public static sObject createSRRecord(acbox__Action_Page_Flow__c appFlow, String empId,string userId, String srRecordTypeId,String nocName,string cardId,string projectId){
        User user = [select Has_Access_To__c,Account_ID__c,Contact.Account.PRO_Email__c,Contact.Account.PRO_Mobile_Number__c,Email,phone,Contact.Account.Email__c,Contact.Account.Mobile__c, Contact.Account.Legal_Form__c from user where Id=:UserInfo.getUserId() ];
        String srObj = appFlow.acbox__Action_Template__r.acbox__Object_API_Name__c;
        String srObjUniqueCode = appFlow.acbox__Action_Template__r.acbox__Unique_Code__c;
        sObject sObj = Schema.getGlobalDescribe().get(srObj).newSObject();
        sObj.put('Account_Name__c', user.Account_ID__c);
        sObj.put('Mobile__c', user.Phone);
        sObj.put('Email_Address__c', user.Email);
        sObj.put('Status__c' , 'Draft');
        sObj.put('Action_Template__c', appFlow.acbox__Action_Template__c);
        
        if(srObj!='OHSE_Request__c' && srObj!='DC_Request__c'){
        sObj.put('Notification_Email__c', user.Contact.Account.PRO_Email__c != null ? user.Contact.Account.PRO_Email__c : user.Contact.Account.Email__c);
        sObj.put('Notification_Mobile_UAE__c', user.Contact.Account.PRO_Mobile_Number__c !=null ? user.Contact.Account.PRO_Mobile_Number__c : user.Contact.Account.Mobile__c);
        }
        if(srObjUniqueCode.equalsIgnoreCase('CompanyRegistration')){
            sObj.put('Business_Entity__c',user.Contact.Account.Legal_Form__c);
        }
        if(empId!=null && empId!=''){
            sObj.put('Visa__c' , empId);
        }
        if(cardId!=null && cardId!='')
        { 
            sObj.put('Renew_Card__c' , cardId);
            if(!string.isblank(nocName)){
                sObj.put('Card_Management__c' , cardId);
                sObj.put('Is_Card_NOC__c', true);
            }
        }

        if(appFlow.acbox__Action_Template__r.acbox__Unique_Code__c == 'WalletWithdrawal'){
             Decimal portalBalance = DS_Commonutility.getPortalUserAccountWalletBalance(user.Account_ID__c);
             sObj.put('Withdrawal_Amount__c' , portalBalance);
        }
        
        if(userId!=null && userId!='')
        {       
            user userRec=[select id,firstName,lastname,email,username,MobilePhone,Agency_Name__c from user where id=:userId];
            sObj.put('Portal_User__c' , userId);
            sObj.put('First_Name__c' , userRec.firstName);
            sObj.put('Last_Name__c' , userRec.lastname);
            sObj.put('Email_Address__c' , userRec.email);
            sObj.put('User_Name__c' , userRec.username);
            sObj.put('Agency_Name__c' , userRec.Agency_Name__c);
            
            sObj.put('Mobile__c' , userRec.MobilePhone);
        }

        if(!string.isblank(nocName)){
            sObj.put('NOC_Type__c' , nocName);
        }
        if(srRecordTypeId!=''){
            sObj.put('RecordTypeId', srRecordTypeId);
        }
        if(appFlow.acbox__Action_Template__r.Category__c == ds_PortalConstants.VEHICLE_NOCS)
        {
            sObj.put('NOC_Type__c' , appFlow.acbox__Action_Template__r.Menu_Text__c);
            sObj.put('NOC_Authority__c' , '53');
            sObj.put('NOC_Type_Authority__c' , appFlow.acbox__Action_Template__r.Menu_Text__c + '-53');
            sObj.put('NOC_Authority_City__c' , 'Dubai');
            sObj.put('NOC_Language__c' , 'Arabic');
        }

                      if (appFlow.acbox__Action_Template__r.acbox__Unique_Code__c == 'VisitVisaFileOpening') {
                    sObj.put('Long_Term_Visa__c', true);
            }

                      if (appFlow.acbox__Action_Template__r.acbox__Unique_Code__c == 'New_Customer_Portal_User'){ 
                    sObj.put('Email_Address__c', '');
                          sObj.put('Mobile__c', '');
                          
                          if(user.Has_Access_To__c!=null && (!user.Has_Access_To__c.contains('Logistics'))){
                              if(user.Has_Access_To__c.contains('Freezone'))
                                  sObj.put('User_Access_Category__c', 'Freezone');
                           else  if(user.Has_Access_To__c.contains('Freelance'))
                                 sObj.put('User_Access_Category__c', 'Freelance');
                          }

                      }


if(!Test.isRunningTest())
        insert sObj;
        if(empId!=null && empId!=''){
            PreVisaDetailustomCode prePopulateDetails=new PreVisaDetailustomCode();
            prePopulateDetails.ProcessData(new freezone_request__c(id=sObj.Id,Action_Template__c=appFlow.acbox__Action_Template__c,Visa__c=empId),'None');
        }
        if(srObjUniqueCode!=null && ( srObjUniqueCode == 'Change Company Address' || srObjUniqueCode == 'FreelanceLicenseRenewalNew' || srObjUniqueCode == 'ChangeCompanyName' || srObjUniqueCode =='Voluntary Suspension of License' || srObjUniqueCode =='License Reactivation' || srObjUniqueCode =='License Cancellation' || srObjUniqueCode == 'LicenseRenewal' || srObjUniqueCode == 'Freelancer License Cancellation'  || srObjUniqueCode == 'Add or Remove License Activity' || srObjUniqueCode == 'Change Legal Status (DWC-LLC to Branch)')){
            PreLicenseCustomCode prePopDetail=new PreLicenseCustomCode();
            prePopDetail.ProcessData(new Licensing_Request__c(id=sObj.Id,Action_Template__c=appFlow.acbox__Action_Template__c,Account_Name__c=user.Account_ID__c),'None');
        }
        if(cardId!=null && cardId!=''){
         FZ_PreFillCardDetailCode.prepopulateFZ(sObj);
        }

        if(projectId !=null && projectId!=''){
            sObj.put('EPASS_Project__c' , projectId);
            
        }


        return sObj;
    }

    public static List<FormDetails> getFormDetailsList(List<acbox.PageFlowFields> returnListOfSection, SObject srObject){
        List<FormDetails> lstFormDetails = new List<FormDetails>();
        for(acbox.PageFlowFields section : returnListOfSection){
            FormDetails details = new FormDetails();
            details.section = section.ObjSection;
            if(details.section.acbox__Is_Child__c){
              childObjectName = details.section.acbox__Child_Object_Name__c;
              parentFieldName = details.section.acbox__Parent_Object_Field__c;
            }
            for(acbox__Section_Detail__c sectionDetails:section.ListSectionDetail){
                 details.sectionDetails.add(sectionDetails);
                if(srObject !=null && String.isNotBlank(sectionDetails.acbox__Default_Value__c)){
                    srObject.put(sectionDetails.acbox__Field_API_Name__c,sectionDetails.acbox__Default_Value__c);
                }
            }
            lstFormDetails.add(details);
        }
        return lstFormDetails;
    }

    public static List<sObject> getFormDetailsResponseChild(SObject srObject, String srId,List<String> fields){
        List<sObject> lstChildObject;
        if(String.isNotBlank(childObjectName) && String.isNotBlank(srId)){
            LIST<String> params = new List<String>{ ds_SOQLLibrary.convertFieldListToString(fields), 
                                                    childObjectName,
                                                    parentFieldName, 
                                                    ds_SOQLLibrary.escapeString(srId)
            };
            lstChildObject = ds_SOQLLibrary.run('getSRRec',params);
        }
        //update service request object with default values of action template
        if(srObject != null){
            update srObject;
        }
        return lstChildObject;
    }

    @AuraEnabled
    public static void apexDeleteRecordServiceRequest(String objectName, String recordId){
        String reqStrQuery = 'SELECT id FROM ' + objectName + ' WHERE Id = :recordId';   
        List<SObject> records = Database.query(reqStrQuery);
        List<acbox__Request_Document__c> lstDocs=[select id from acbox__Request_Document__c where Visitors_Information__c=:recordId];
        if(lstDocs.size()>0)
            delete lstDocs;
        if(records.size()>0)
        delete records[0];  
    }
    @AuraEnabled(cacheable=true)
    public static List<Object> getServiceRecord(String actionTemplateId, String ServiceReqId) {
        List<CustomObjectData> dataList = new List<CustomObjectData>();
        List<acbox__Section__c> returnListOfSection = new List<acbox__Section__c>();
        List<acbox__Action_Page_Flow__c> appFlow = [SELECT acbox__Action_Template__c, 
                                                            acbox__Action_Template__r.acbox__Object_API_Name__c,
                                                             acbox__Action_Template__r.Name 
                                                             FROM acbox__Action_Page_Flow__c 
                                                         WHERE acbox__Action_Template__c = :actionTemplateId and acbox__Order__c = 2    ];
        if(!appFlow.isEmpty()){
            returnListOfSection = getapplicationFlowDetails(appFlow[0].Id);
        }
        List<String> serviceReqfields = new List<String>();
        List<String> labels = new List<String>();
        for(acbox__Section__c section : returnListOfSection){
            for(acbox__Section_Detail__c sectionDetails : section.acbox__Section_Details__r){
                if(sectionDetails.acbox__Field_Type__c.equalsIgnoreCase('Lookup')){
                    serviceReqfields.add(sectionDetails.acbox__Lookup_Field_name__c+'.Name');                    
                 }else{
                     serviceReqfields.add(sectionDetails.acbox__Field_API_Name__c);
                 } 
                 labels.add(sectionDetails.acbox__Label_Override__c);
            }
        }
        String objName = appFlow[0].acbox__Action_Template__r.acbox__Object_API_Name__c;
        String reqStrQuery = 'SELECT ' + String.join(serviceReqfields, ',') + ' FROM ' + objName + ' WHERE Id = :ServiceReqId';   
        system.debug(ServiceReqId +'=='+reqStrQuery);
        SObject record = Database.query(reqStrQuery);
        if(record != null) {
            for(Integer i = 0; i < serviceReqfields.size(); i++) {
                CustomObjectData objData = new CustomObjectData();
                String fieldName = serviceReqfields[i];
                objData.label = labels[i];
                if(fieldName.contains('.')) {
                    String[] relationshipField = fieldName.split('\\.');
                    if(record.getSObject(relationshipField[0]) != null && record.getSObject(relationshipField[0]).get(relationshipField[1]) != null) {
                        objData.value = String.valueOf(record.getSObject(relationshipField[0]).get(relationshipField[1]));
                    } else {
                        objData.value = '-';
                    }
                } else {
                    Object fieldValue = record.get(fieldName);
                    if(fieldValue != null) {
                        if (fieldValue instanceof Date) {
                            // Format date field value
                            DateTime dateTimeValue = DateTime.newInstance(((Date)fieldValue).year(), ((Date)fieldValue).month(), ((Date)fieldValue).day(), 0, 0, 0);
                            objData.value = dateTimeValue.format('dd MMMM, yyyy hh:mm a');
                        } else if (fieldValue instanceof DateTime) {
                            // Format datetime field value
                            objData.value = ((DateTime)fieldValue).format('dd MMMM, yyyy hh:mm a');
                        } else {
                            objData.value = String.valueOf(fieldValue);
                        }
                    } else {
                        objData.value = '-';
                    }
                }
                dataList.add(objData);
            }
        } else {
            // add empty strings or default values for all fields if there is no record
            for (Integer i = 0; i < serviceReqfields.size(); i++) {
                CustomObjectData objData = new CustomObjectData();
                objData.label = labels[i];
                objData.value = '-';
                dataList.add(objData);
            }
        }
        return dataList;
}
    public class CustomObjectData {
        @AuraEnabled
        public String label;
        @AuraEnabled
        public String value;
    }
    public class FormDetails{
         acbox__Section__c section;
         List<acbox__Section_Detail__c> sectionDetails;
        public FormDetails(){
            this.section = new acbox__Section__c();
            this.sectionDetails = new List<acbox__Section_Detail__c>();
        }
    }
    public class FormDetailsData{
        List<FormDetails> FormDetails;
        String sr_Id;
        Map<String,Map<String,Map<String, Set<String>>>> dependentPickListValues;
        String srRecordTypeId;
        sObject recData;
        public FormDetailsData(){
            this.sr_Id = '';
            this.FormDetails = new List<FormDetails>();
            this.dependentPickListValues = new    Map<String,Map<String,Map<String, Set<String>>>>();
            this.srRecordTypeId = '';
            this.recData = null;
        }
        public FormDetailsData(List<FormDetails> form_details,String sr_Id,  Map<String,Map<String,Map<String, Set<String>>>> depdendentPickListValues,
                              String srRecordTypeId,sObject recData){
            this.sr_Id = sr_Id;
            this.FormDetails = form_details;
            this.dependentPickListValues = depdendentPickListValues;
            this.srRecordTypeId = srRecordTypeId;
            this.recData = recData;
        }
    }
}