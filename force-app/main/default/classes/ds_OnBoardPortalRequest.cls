/*****************************************************************************************************
* Version       Author           Date             Comment                                                                       
* 2.0           Shubham Dighe   10OCT2024        Added method getLocationDetails to show the product location on Digital Onboarding request creation
* 2.1           Shubham Dighe   07NOV2024        Added Changes to create Secondary Passport document for Company Registration
*****************************************************************************************************/
global without sharing class ds_OnBoardPortalRequest {
    public static boolean isModify = false;
    @AuraEnabled(cacheable=false)
    public static String checkCorporateUBO(String srId) {
        String noCorporateUBO = '';

        if (String.isNotBlank(srId)) {
            Onboard_Request__c ob = [SELECT Id, Business_Entity__c FROM Onboard_Request__c  WHERE Id = :srId LIMIT 1];
            List<OB_Amendment__c> onbAmmList = [SELECT Id, Owner_Type__c, Role__c FROM OB_Amendment__c WHERE Onboard_Request__c = :srId];
            if (ob.Business_Entity__c == 'DWC-Branch') {
                Boolean hasCorporateUBO = false;
                for (OB_Amendment__c obm : onbAmmList) {
                    if (
                        obm.Owner_Type__c == 'Corporate' &&
                        obm.Role__c != null &&
                        obm.Role__c.contains('UBO')
                    ) {
                        hasCorporateUBO = true;
                        break; // No need to continue once found
                    }
                }
                if (!hasCorporateUBO) {
                    noCorporateUBO = 'No';
                }
            }
        }
        return noCorporateUBO;
    }

    @AuraEnabled(cacheable=false)
    public static String checkCorporateUBOMotherCompany(String srId) {
        String motherCompanyUboExist = '';

        if (String.isNotBlank(srId)) {
            Onboard_Request__c ob = [SELECT Id, Business_Entity__c,Parent_Company_Name__c FROM Onboard_Request__c  WHERE Id = :srId LIMIT 1];
            List<OB_Amendment__c> onbAmmList = [SELECT Id, Full_Name__c,Owner_Type__c, Role__c FROM OB_Amendment__c WHERE Onboard_Request__c = :srId];
            if (ob.Business_Entity__c == 'DWC-Branch') {
                Boolean hasmothercompUBO = false;
                for (OB_Amendment__c obm : onbAmmList) {
                    
                    if (
                        obm.Owner_Type__c == 'Corporate' &&
                        obm.Role__c != null &&
                        obm.Role__c.contains('UBO') &&
                        ob.Parent_Company_Name__c != null &&
                        ob.Parent_Company_Name__c.equalsIgnoreCase(obm.Full_Name__c)
                    ) {
                        hasmothercompUBO = true;
                        break; 
                    }
                }
                if (!hasmothercompUBO) {
                    motherCompanyUboExist = 'No';
                }
            }
        }
        return motherCompanyUboExist;
    }
	
     @AuraEnabled(cacheable=true)
    public static Map<String, Object> getVisaAndEstablishmentDetails(Id onboardRequestId) {
        Map<String, Object> result = new Map<String, Object>();
        
        Onboard_Request__c onboardRequest = [SELECT Id, Account_Name__c FROM Onboard_Request__c WHERE Id = :onboardRequestId LIMIT 1];
        
        if (onboardRequest.Account_Name__c != null) {
            Account account = [SELECT Id, Name, (SELECT Establishment_Card_Number__c, Expiry_Date__c FROM Establishment_Cards__r WHERE Status__c = 'Issued'), 
                               (SELECT Name, Visa_Holder__r.Name FROM Visas__r WHERE Visa_Validity_Status__c = 'Active') 
                               FROM Account WHERE Id = :onboardRequest.Account_Name__c LIMIT 1];
            
            result.put('accountName', account.Name);
            result.put('establishmentCards', account.Establishment_Cards__r);
            result.put('visas', account.Visas__r);
        } else {
            result.put('accountName', 'No account linked to this request.');
            result.put('establishmentCards', new List<Establishment_Card__c>());
            result.put('visas', new List<Visa__c>());
        }
        
        return result;
    }
    
    @AuraEnabled(cacheable=false)
    public static String createsObjectRecord(sObject record, String contentVersionId) {
        System.debug('record==== '+record);
        System.debug('contentVersionId==== '+contentVersionId);
       //Id individualRecordTypeId= Schema.SObjectType.OB_Amendment__c.getRecordTypeInfosByDeveloperName().get('Individual').getRecordTypeId(); 
       Id individualRecordTypeId= Schema.SObjectType.OB_Amendment__c.getRecordTypeInfosByDeveloperName().get('Company_Registration_Individual').getRecordTypeId(); 
       Id corporateRecordTypeId = Schema.SObjectType.OB_Amendment__c.getRecordTypeInfosByDeveloperName().get('Corporate').getRecordTypeId();
       Id government_StockExchange_RecordTypeId = Schema.SObjectType.OB_Amendment__c.getRecordTypeInfosByDeveloperName().get('Government_Listed_on_Stock_Exchange').getRecordTypeId();
       if(String.isNotBlank((String)record.get('Owner_Type__c')) && String.isNotBlank((String)record.get('Company_Name__c')) && record.get('Owner_Type__c') != 'Individual'){
         String companyName = (String)record.get('Company_Name__c'); 
         companyName = (companyName.length()>80 ? ((companyName.substring(0,79))) : companyName);   
         record.put('Full_Name__c',record.get('Company_Name__c'));   
         record.put('Last_Name__c', companyName);
         if(record.get('Owner_Type__c') == 'Government / Listed on Stock Exchange')
         record.put('recordTypeId', government_StockExchange_RecordTypeId);
         else
         record.put('recordTypeId', corporateRecordTypeId);
       }else if(String.isNotBlank((String)record.get('Owner_Type__c')) && String.isBlank((String)record.get('Company_Name__c')) && record.get('Owner_Type__c') == 'Corporate'){
           if(String.isNotBlank((String)record.get('DACC_Registered__c')) && record.get('DACC_Registered__c') == 'Yes'){
               String relAccId = (String)record.get('Corporate_Account__c');
               List<Account> accList =  [Select id,Name,Registration_Number_Value__c from Account where id=:relAccId];
               if(accList != null && !accList.isEmpty()){
                   String companyName = (String)accList[0].name; 
         		   companyName = (companyName.length()>80 ? ((companyName.substring(0,79))) : companyName);  
                   record.put('Full_Name__c', companyName);
                   record.put('Company_Name__c', companyName);
                   record.put('Registration_Number__c', accList[0].Registration_Number_Value__c);
                   record.put('recordTypeId', corporateRecordTypeId);
               }  
           }
       }
        else if(String.isBlank((String)record.get('Full_Name__c'))){
          record.put('recordTypeId', individualRecordTypeId);
          record.put('Full_Name__c',record.get('First_Name__c') + ' ' + record.get('Last_Name__c'));
        }
         
        upsert record;
        if(!string.isEmpty(contentVersionId) && contentVersionId != null){
            attachFileToRecord(contentVersionId,record);          
        }
        
        return record.Id;
    }
    
    @AuraEnabled(cacheable=false)
    public static String updateAmendmentRecord(sObject record, String contentVersionId, String role){
       System.debug(record);
        string sortedRole = '';
       Id recTypeid= Schema.SObjectType.OB_Amendment__c.getRecordTypeInfosByDeveloperName().get('Individual').getRecordTypeId(); 
        String amendmentId = String.valueOf(record.get('Id'));
        if(amendmentId !=null){
            OB_Amendment__c objAmendment = [Select Id, Role__c FROM OB_Amendment__c WHERE Id=:amendmentId];
            system.debug('objAmendment--->'+objAmendment);
            string roleStr = String.valueOf(record.get('Role__c')+';'+objAmendment.Role__c);
            List<String> sortList = roleStr.split(';');
            system.debug('roleStr--->'+roleStr);
            sortList.sort();
            system.debug('sortList Sort--->'+sortList);
            String roleString = '';
            for(String str : sortList){
            roleString = roleString + str +';';
            }
            roleString = roleString.removeEnd(';');
            record.put('Role__c', roleString);   
            //record.put('Role__c', roleStr);
            system.debug('record--->'+record.get('Role__c'));
            update record;
            if(!string.isEmpty(contentVersionId) && contentVersionId != null){
                attachFileToRecord(contentVersionId,record);          
            }      
        }
        return record.Id;
    }
    
    
    @AuraEnabled(cacheable=false)
    public static string updatesObjectRecord(sObject record) {
        update record;
        return record.Id;
    }
   

    @AuraEnabled(cacheable=false)
    public static RequestDataWrapper getTemplateDetails(String recid) {
    RequestDataWrapper reqWrap= new RequestDataWrapper();
    String fileObjName = ID.valueOf(recid).getSObjectType().getDescribe().getName();
    reqWrap.objApiName=fileObjName;
   
    if(fileObjName == 'Onboard_Request__c'){
        Onboard_Request__c obreq = [SELECT Id, Name, Status__c, Action_Template__c,Action_Template__r.Name, Submitted_Date__c, Completed_Date__c FROM Onboard_Request__c WHERE Id=:recid];
        reqWrap.status = obreq.Status__c;
        reqWrap.actionTempId =obreq.Action_Template__c;
        reqWrap.name = obreq.Name;
        reqWrap.templateName = obreq.Action_Template__r.Name;
        reqWrap.submittedDate =obreq.Submitted_Date__c;
        reqWrap.completedDate =obreq.Completed_Date__c;
        
    }
    System.debug('sai======='+reqWrap);
    return reqWrap;
    }
    public class RequestDataWrapper {
        @AuraEnabled
        public String objApiName { get; set; }
         @AuraEnabled
        public String actionTempId { get; set; }
         @AuraEnabled
        public String status { get; set; }
         @AuraEnabled
        public String name { get; set; }
        @AuraEnabled
        public String templateName { get; set; }
         @AuraEnabled
        public DateTime submittedDate { get; set; }
         @AuraEnabled
        public DateTime completedDate { get; set; }

    }
     @AuraEnabled(cacheable=false)
    public static Boolean getactionTemplateDetail(string actTempId) {
        Boolean isCompanyReview = false;
        List<acbox__Action_Template__c> actList = [Select Id,acbox__Unique_Code__c from acbox__Action_Template__c where Id=:actTempId and (acbox__Unique_Code__c='AddorRemoveDirector' OR acbox__Unique_Code__c='AddorRemoveUBO' OR acbox__Unique_Code__c='UpdateDirector' OR acbox__Unique_Code__c='AddorRemoveManager' OR acbox__Unique_Code__c='AddorRemoveSecretary' OR acbox__Unique_Code__c='UpdateManager' OR acbox__Unique_Code__c='UpdateSecretary' OR acbox__Unique_Code__c='UpdateShareholder' OR acbox__Unique_Code__c='SharePledge' OR acbox__Unique_Code__c='SharePledgeRelease' OR acbox__Unique_Code__c='ShareTransfer' OR acbox__Unique_Code__c='Increase Share Capital With New Shareholders' OR acbox__Unique_Code__c='Change Share Capital With Existing Shareholders' OR acbox__Unique_Code__c='CompanyRegistration' OR acbox__Unique_Code__c='Add or Remove License Activity' OR acbox__Unique_Code__c='FreelancerRegistration') Limit 1 ];
        if(actList.size()>0){
            isCompanyReview=true;
        }
        return isCompanyReview;
    }
    
    @AuraEnabled(cacheable=false)
    public static Onboard_Request__c getAccountDetails(string srId) {
        Onboard_Request__c ob = new Onboard_Request__c();
        if(srId!=null && srId!=''){
            ob = [Select id,Legal_Type__c,Business_Entity__c,Parent_Company_Country__c,Share_Capital__c,Account_Name__c,Account_Name__r.Current_Establishment_Card__c,Account_Name__r.Current_Establishment_Card__r.Expiry_Date__c,Account_Name__r.Arabic_Account_Name__c,Account_Name__r.Current_License_Number__r.Commercial_Name_Arabic__c,Account_Name__r.Current_License_Number__r.Commercial_Name__c,Area_Name__c,Lease_Selection__c,Tenancy_Contract__c,Building_Name__c,Floor_Shop_No__c,Lease_Expiry_Date__c,Lease_Start_Date__c,Lease_Type__c,Action_Template__r.acbox__Unique_Code__c,Account_Name__r.Current_License_Number__c,License__c,Account_Record_Type_Name__c,What_Is_Your_Financial_Year__c,Active_Operating_Location__c,X3rd_Party_Lease__c,License_Renewal_for_years__c,Shareholder_Details_Are_Up_To_Date__c,Director_Details_Are_Up_To_Date__c,Manager_Details_Are_Up_To_Date__c,Communication_Details_Are_Up_To_Date__c,UBO_Details_Are_Up_To_Date__c,Account_Name__r.What_is_your_financial_year__c,Account_Name__r.License_Number_Formula__c,Account_Name__r.License_Expiry_Date__c,Account_Name__r.Account_Arabic_Name__c,Account_Name__r.Name,Account_Name__r.Establishment_Card_Expiry_Date__c,Account_Billing_Address__c,Account_Name__r.Commercial_Name__c,Account_Name__r.Legal_Form__c,Service_Type__c from Onboard_Request__c where Id=:srId];
        }
        return ob;
    }
     @AuraEnabled(cacheable=false)
    public static Licensing_Request__c getAccountDetailsLr(string srId) {
        Licensing_Request__c ob = new Licensing_Request__c();
        if(srId!=null && srId!=''){
            ob = [Select id,Account_Name__c from Licensing_Request__c where Id=:srId];
        }
        return ob;
    }
    
    //2.0
    @AuraEnabled(cacheable=false)
    public static String getLocationDetails(String srId) {
        String location = '';
        
        if (srId != null && srId != '') {
            Onboard_Request__c ob = [SELECT Id, Account_Name__c FROM Onboard_Request__c WHERE Id = :srId LIMIT 1];
            List<Opportunity> oppList = [SELECT Id FROM Opportunity WHERE AccountId = :ob.Account_Name__c LIMIT 1];
            if (!oppList.isEmpty()) {
                Opportunity opp = oppList[0];
                List<OpportunityLineItem> oppLines = [SELECT Id, Product2Id, Operating_location__c, 
                                                      Product2.Building_Name__c, Product2.Floor__c, Product2.Zone__c
                                                      FROM OpportunityLineItem 
                                                      WHERE OpportunityId = :opp.Id 
                                                      ORDER BY Operating_location__c DESC 
                                                      LIMIT 1];
                if (!oppLines.isEmpty()) {
                    OpportunityLineItem lineItem = oppLines[0];
                    String buildingName = lineItem.Product2.Building_Name__c != null ? lineItem.Product2.Building_Name__c+',' : '';
                    String floor = lineItem.Product2.Floor__c != null ? lineItem.Product2.Floor__c+',' : '';
                    String zone = lineItem.Product2.Zone__c != null ? lineItem.Product2.Zone__c+',' : '';
                    
                    
                    location = buildingName + ' ' 
                        + floor + ' ' 
                        + zone + ' Dubai, United Arab Emirates.';
                }
            }
        }
        
        return location;
    }


    
     @AuraEnabled(cacheable=false)
    public static Map<String, Id> getAccountLeaseDetails(string srId) {
        Onboard_Request__c ob = new Onboard_Request__c();
        List<Contract_DWC__c> tcList = new List<Contract_DWC__c>();
        List<Contract_DWC__c> tcListExp = new List<Contract_DWC__c>();
        Map<String, String> picklistValues = new Map<String, String>();
        String accId;
        if(srId!=null && srId!='') {
            ob = [Select id,Action_Template__r.acbox__Unique_Code__c,Account_Name__r.Current_License_Number__c,License__c,Account_Record_Type_Name__c,What_Is_Your_Financial_Year__c,Active_Operating_Location__c,X3rd_Party_Lease__c,License_Renewal_for_years__c,Shareholder_Details_Are_Up_To_Date__c,Director_Details_Are_Up_To_Date__c,Manager_Details_Are_Up_To_Date__c,Communication_Details_Are_Up_To_Date__c,UBO_Details_Are_Up_To_Date__c,Account_Name__c,Account_Name__r.What_is_your_financial_year__c,Account_Name__r.License_Number_Formula__c,Account_Name__r.License_Expiry_Date__c,Account_Name__r.Account_Arabic_Name__c,Account_Name__r.Name,Account_Name__r.Establishment_Card_Expiry_Date__c,Account_Billing_Address__c,Account_Name__r.Commercial_Name__c,Account_Name__r.Legal_Form__c,Service_Type__c from Onboard_Request__c where Id=:srId];
            accId=ob.Account_Name__c;
            tcList =[Select id,First_Line_Item_Unit_Name__c,Tenant__c,Status__c from Contract_DWC__c where Tenant__c=:accId and Status__c='Active'];
            tcListExp = [Select id,First_Line_Item_Unit_Name__c,Tenant__c,Status__c from Contract_DWC__c where Tenant__c=:accId and Status__c!='Active'];
            if(tcList.size()>0) {
                for(Contract_DWC__c contract : tcList) {
                    picklistValues.put(contract.First_Line_Item_Unit_Name__c, contract.Id);
                }
            }else if(tcListExp.size()>0){
                picklistValues.put('Lease Expired','');
            }else {
                picklistValues.put('No Active Lease','');
            }
        }
        return picklistValues;
    }
    @AuraEnabled(cacheable=false)
    public static void createLicenseActivitiesDocs(string srId) {
        Onboard_Request__c ob = new Onboard_Request__c();
        List<Onboard_Request__c> obrlist = [select id,Account_Name__c,Account_Name__r.Current_License_Number__c from Onboard_Request__c where id=:srId];   
        if(obrlist != null && !obrlist.isEmpty()){

        }
    }
    public static String createContentDistribution(Id contentVersionId,String name){
        string url ='';
        ContentDistribution distribution = new ContentDistribution();
        distribution.ContentVersionId = contentVersionId;
        distribution.Name = name;
        distribution.PreferencesAllowOriginalDownload = false;
        distribution.PreferencesAllowPDFDownload = true;
        distribution.PreferencesAllowViewInBrowser = true;
        insert distribution;
        List<ContentDistribution> cds = [SELECT DistributionPublicUrl FROM ContentDistribution WHERE Id =: distribution.Id];
        if(!cds.isEmpty()){
            url = cds[0].DistributionPublicUrl;
        }
        return url;
    }
    
    @AuraEnabled
    public static void attachFileToRecord(Id contentVersionId, SObject record) {
       
        String parentRecId = (String)record.get('Onboard_Request__c');
        
        List<ContentVersion> conDocument = [SELECT ContentDocumentId,Title FROM ContentVersion WHERE Id =:contentVersionId Limit 1];
        String docTitle = conDocument[0].Title;
        docTitle =  docTitle.contains('.') ? (docTitle.substring(0,docTitle.lastIndexOf('.'))) : docTitle;
        String docName =  docTitle+'_'+ (String)record.get('Full_Name__c');
        docName = ((docName.length() <=80) ? docName : (docName.substring(0,80)));
        String rqDocId = createRequestDocument(parentRecId,'',docName,record.Id,'');
        system.debug('rqDocId::'+rqDocId);
        ContentDocumentLink contentLink = new ContentDocumentLink();
        contentLink.ContentDocumentId = conDocument[0].ContentDocumentId;
        contentLink.LinkedEntityId = rqDocId;
        contentLink.ShareType = 'V'; // 'V' for view access, 'I' for edit access
        contentLink.Visibility = 'AllUsers'; // or 'InternalUsers'
        insert contentLink;
         system.debug('contentLink::'+contentLink.id);
        ContentDistribution distribution = new ContentDistribution();
        distribution.ContentVersionId = contentVersionId;
        distribution.Name = docName; // Set a meaningful name
        distribution.PreferencesAllowOriginalDownload = false;
        distribution.PreferencesAllowPDFDownload = true;
        distribution.PreferencesAllowViewInBrowser = true;
        distribution.RelatedRecordId = rqDocId;
        insert distribution;
        system.debug('distribution::'+distribution.id);
        List<ContentDistribution> cds =[SELECT DistributionPublicUrl FROM ContentDistribution WHERE Id =: distribution.Id];
        if(!cds.isEmpty()){
            record.put('Document_Link__c', cds[0].DistributionPublicUrl);
            record.put('Document_Id__c',  conDocument[0].ContentDocumentId);
            record.put('Document_Name__c',  distribution.Name);
        }
        upsert record;
       List<acbox__Request_Document__c> rqDocList =  [select id,DocPublicURL__c,acbox__File_Document_SF_18__c from acbox__Request_Document__c where id=:rqDocId];
       if(rqDocList != null && !rqDocList.isEmpty()){
           rqDocList[0].DocPublicURL__c = cds[0].DistributionPublicUrl;
           rqDocList[0].acbox__File_Document_SF_18__c = conDocument[0].ContentDocumentId;
           update rqDocList;
       }
       
    } 
    
    public static String createRequestDocument(String parentRecordId,String contentDocumentId, String documentTitle, String OARecordId, String docUrl){
        String rqDocId = null; 
        String passportCopyId = '';
        String tradelicenseCopyId = '';
        String goodStandingCertificateCopyId = '';
        for(acbox__Action_Document__c ad :[SELECT Id,acbox__Action_template__r.Name,Name,acbox__Type__c FROM acbox__Action_Document__c Where acbox__Action_template__r.acbox__Unique_Code__c='CompanyRegistration' and (acbox__Type__c='Passport' or acbox__Type__c='TradeLicense' or acbox__Type__c='GoodStandingCertificate') and acbox__Stage__c='On Action' and acbox__Active__c = true]){
          if(ad.acbox__Type__c == 'TradeLicense'){
            tradelicenseCopyId = ad.Id;
          }else if(ad.acbox__Type__c == 'GoodStandingCertificate'){
            goodStandingCertificateCopyId = ad.Id;
          }else{
            passportCopyId = ad.Id;
          }
        }
        acbox__Request_Document__c rd = new acbox__Request_Document__c();
        rd.acbox__File_Document_SF_18__c =  contentDocumentId;
        rd.acbox__Record_Id__c = parentRecordId;
        if(documentTitle.startsWithIgnoreCase('TradeLicenseCopy')){      
          rd.acbox__Action_Document__c = tradelicenseCopyId;
        }else if(documentTitle.startsWithIgnoreCase('GoodStandingCertificateCopy')){      
          rd.acbox__Action_Document__c = goodStandingCertificateCopyId;
        }else if(passportCopyId != NUll && passportCopyId!=''){
          rd.acbox__Action_Document__c =passportCopyId;
        }
        rd.Onboard_Request__c = parentRecordId;
        rd.OB_Amendment__c = OARecordId;
        rd.acbox__Active__c = true;
        rd.DocPublicURL__c = docUrl;
        rd.acbox__Status__c = 'Uploaded';
        rd.Name =  documentTitle;
        insert rd;
        rqDocId = rd.id;
        return rqDocId;
    }
    @AuraEnabled
    public static void deleteRelatedDocuments(String reqId,String recId){
       List<acbox__Request_Document__c> adList = [SELECT Id FROM acbox__Request_Document__c Where OB_Amendment__c=:recId and Onboard_Request__c=:reqId];
        if(adList.size()>0){
            delete adList;
        }
    }
    //Added by Vinod to delete the Amendment record when manager details are re-uploaded in Initial Approval process.
    @AuraEnabled
    public static boolean deleteAmendmentRecord(String recordId){
        List<OB_Amendment__c> amendmentList = [SELECT Id,(SELECT Id FROM Request_Documents__r) FROM OB_Amendment__c Where Onboard_Request__c=:recordId];
        if(amendmentList.size()>0){
            if(amendmentList[0].Request_Documents__r.size()>0){
                delete amendmentList[0].Request_Documents__r;
            }
            delete amendmentList;
        }
        return true;
    }
    
    @AuraEnabled
    public static void deleteUploadedFiles(string oaRecordId){
        OB_Amendment__c oa = new OB_Amendment__c();
        oa.Document_Id__c = '';
        oa.Document_Link__c = '';
        oa.Document_Name__c = '';
        oa.Id = oaRecordId;
        update oa;
        
        delete [SELECT Id FROM acbox__Request_Document__c Where OB_Amendment__c =:oaRecordId];
        List<ContentDocumentLink> linksToDelete = [
            SELECT Id
            FROM ContentDocumentLink
            WHERE LinkedEntityId = :oaRecordId
        ];

        // Delete the ContentDocumentLink records
        if (!linksToDelete.isEmpty()) {
            delete linksToDelete;
        }
    }
    
    /*@AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper getExistingDirectorsFromAccount(String recordId){
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:recordId]; 
        wrapper.relationshipsList =[Select Id,Account__c,Relationship_Account__c,Active__c,End_Date__c,Relationship_Type__c,Start_Date__c,Status__c,Relationship_Account__r.Passport_No__c,Relationship_Account__r.Name From Relationships__c where Account__c=:obrList[0].Account_Name__c and Relationship_Type__c='Director' and Status__c='Active'];
        return wrapper;
    }*/
    @AuraEnabled(cacheable=false)
    public static ShareholderDataWrapper getExistingShareholderFromAccount(String recordId){ //, String role
        ShareholderDataWrapper wrapper = new ShareholderDataWrapper();
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c,Amendment_text__c from Onboard_Request__c where Id=:recordId]; 
        if(obrList != null && !obrList.isEmpty()){
          wrapper.relationshipsList =[Select Id,Company__c,Shareholder__c,Shareholder__r.name,Shareholder__r.Passport_No__c,Shareholder__r.Registration_Number__pc,Shareholder__r.Customer_Nationality__r.Name,Shareholder__r.Owner_Type__pc,Shareholder_Status__c,No_of_Shares__c,Ownership_percentage__c,Shareholder__r.BillingStreet,Shareholder__r.BillingCity,Shareholder__r.BillingCountry,Share_Ownership_Billing_Address__c,Pledge__c,Pledgee__c,Number_of_Pledged_shares__c,Pledge_date__c,Pledge_End_Date__c From Share_Ownership__c where Company__c=:obrList[0].Account_Name__c and Shareholder_Status__c='Active'];
          wrapper.amendmentType = obrList[0].Amendment_text__c; 
        }
        //wrapper.amendmentList = [SELECT Id, Full_Name__c, Passport_Number__c, Role__c,Status__c,Onboard_Request__c FROM OB_Amendment__c WHERE Onboard_Request__c = :recordId AND (Status__c = 'New')];
        return wrapper;
    }

     /* To fetch account member details  */
   @AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper getExistingDataFromAccount(String recordId){ //, String role
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:recordId]; 
        List<Account> personAccountList = [Select Id,Salutation,Gender__c,FirstName,LastName,Middle_Name__pc,First_Name_Arabic__c,Middle_Name_Arabic__c,Last_Name_Arabic__c,Resident_in_Dubai__pc,UAE_Id__c,In_Out__c,U_I_D_NO__c,Passport_No__c,Do_you_have_dual_Nationality__c,Phone,Mobile__c,
                                  PersonBirthdate,Customer_Nationality__c,Place_of_Birth__c,Country_of_Birth__c,Email__c,BillingStreet,BillingCity,BillingCountry,Building_Villa_Flat__c,Street_Name__c,City_Town__c,Area__c,Billing_PO_Box_Postal_Code__c,Country_Address__c,
                                  Owner_Type__c,Document_Name__c,Document_Link__c,Document_Id__c,BillingPostalCode,BoardMember_Role__c
                                  FROM Account WHERE IsPersonAccount = true and BoardMember_Role__c = 'Manager' AND Agent_Ref__c =:obrList[0].Account_Name__c];

        wrapper.personAccountList = personAccountList;
        wrapper.amendmentList = [SELECT Id, Full_Name__c, Passport_Number__c, Role__c,Status__c,Onboard_Request__c FROM OB_Amendment__c WHERE Onboard_Request__c = :recordId AND Status__c = 'New' AND Owner_Type__c = 'Individual'];
        return wrapper;
    } 

    /* To fetch account member details  */
  /* @AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper getExistingDirectorsFromAccount(String recordId){ //, String role
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:recordId]; 
        List<Directorship__c> dirList = [Select Id,Director__r.Passport_Expiry_Date__pc,Company__c,Director__c,Directorship_End_Date__c,Roles__c,Directorship_Start_Date__c,Director_Status__c,Director__r.Passport_No__c,Director__r.Name,Director__r.Owner_Type__pc,Director__r.Email__c,Director__r.Phone_Number__c,Director__r.Customer_Nationality__r.name From Directorship__c where Company__c=:obrList[0].Account_Name__c and Director_Status__c='Active'];
        List<UBO__c> uboList = [Select Id,UBO_Type__c,UBO__r.Passport_Expiry_Date__pc,UBO__r.Commercial_Registration_Number__c,UBO__r.Country_of_Origin__r.name,Company__c,UBO__c,UBO_End_Date__c,UBO_Start_Date__c,Status__c,UBO__r.Passport_No__c,UBO__r.Name,UBO__r.Owner_Type__pc,UBO__r.Email__c,UBO__r.Phone_Number__c,UBO__r.Customer_Nationality__r.name From UBO__c where Company__c=:obrList[0].Account_Name__c and Status__c='Active'];
        List<Management_Member__c> mgrList = [Select Id,Company__c,Manager__c,Manager__r.Passport_Expiry_Date__pc,Manager_End_Date__c,Role__c,Manager_Start_Date__c,Manager_Status__c,Manager__r.Passport_No__c,Manager__r.Name,Manager__r.Owner_Type__pc,Manager__r.Email__c,Manager__r.Phone_Number__c,Manager__r.Customer_Nationality__r.name From Management_Member__c where Company__c=:obrList[0].Account_Name__c and Manager_Status__c='Active'];
        List<Share_Ownership__c> shrList = [Select Id,Shareholder__r.Passport_Expiry_Date__pc,Company__c,Shareholder__c,Ownership_End_Date__c,Ownership_Start_Date__c,Shareholder_Status__c,Shareholder__r.Passport_No__c,Shareholder__r.Name,Shareholder__r.Owner_Type__pc,Shareholder__r.Email__c,Shareholder__r.Phone_Number__c,Shareholder__r.Registration_Number__pc,Shareholder__r.Customer_Nationality__r.name From Share_Ownership__c where Company__c=:obrList[0].Account_Name__c and Shareholder_Status__c='Active'];
        List<RelationShipWrapper> relationshipList = new List<RelationShipWrapper>();
        Date passportExpDt = null;
        for(Directorship__c dir : dirList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = dir.id;
            rel.name = dir.Director__r.Name;
            rel.role = dir.Roles__c;
            rel.passportNumber = dir.Director__r.Passport_No__c;
            passportExpDt = dir.Director__r.Passport_Expiry_Date__pc;
            rel.passportExpiryDate = (passportExpDt != null) ? (DateTime.newInstance(passportExpDt.year(),passportExpDt.month(),passportExpDt.day()).format('MMM dd,YYYY')) : '' ; 
            //rel.passportExpiryDate=dir.Director__r.Passport_Expiry_Date__pc;
            rel.nationality = dir.Director__r.Customer_Nationality__r.name;
            rel.status = dir.Director_Status__c;
            rel.ownerType = dir.Director__r.Owner_Type__pc;
            rel.email = dir.Director__r.Email__c;
            rel.mobileNo = dir.Director__r.Phone_Number__c;
            rel.relAccId = dir.Director__c;
            relationshipList.add(rel);
        }
        for(Management_Member__c mgr : mgrList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = mgr.id;
            rel.name = mgr.Manager__r.Name;
            rel.role = 'Manager';
            rel.passportNumber = mgr.Manager__r.Passport_No__c;
            passportExpDt = mgr.Manager__r.Passport_Expiry_Date__pc;
            rel.passportExpiryDate = (passportExpDt != null) ? (DateTime.newInstance(passportExpDt.year(),passportExpDt.month(),passportExpDt.day()).format('MMM dd,YYYY')) : '' ; 
            
            //rel.passportExpiryDate = mgr.Manager__r.Current_Passport__r.Passport_Expiry_Date__c;
            rel.nationality = mgr.Manager__r.Customer_Nationality__r.name;
            rel.status = mgr.Manager_Status__c;
            rel.ownerType = mgr.Manager__r.Owner_Type__pc;
            rel.email = mgr.Manager__r.Email__c;
            rel.mobileNo = mgr.Manager__r.Phone_Number__c;
            rel.relAccId = mgr.Manager__c;
            relationshipList.add(rel);
        }
        for(Share_Ownership__c sh : shrList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = sh.id;
            rel.name = sh.Shareholder__r.Name;
            rel.role = 'Shareholder';
            rel.passportNumber = (String.isNotBlank(sh.Shareholder__r.Owner_Type__pc) && sh.Shareholder__r.Owner_Type__pc == 'Corporate') ? sh.Shareholder__r.Registration_Number__pc : sh.Shareholder__r.Passport_No__c;
            //rel.passportExpiryDate = sh.Shareholder__r.Passport_Expiry_Date__pc;
            passportExpDt = sh.Shareholder__r.Passport_Expiry_Date__pc;
            rel.passportExpiryDate = (passportExpDt != null) ? (DateTime.newInstance(passportExpDt.year(),passportExpDt.month(),passportExpDt.day()).format('MMM dd,YYYY')) : '' ; 
            //rel.nationality = (String.isNotBlank(sh.Shareholder__r.Owner_Type__pc) && sh.Shareholder__r.Owner_Type__pc == 'Corporate') ? sh.Shareholder__r.Place_of_Registration__pr.name : sh.Shareholder__r.Customer_Nationality__r.name;
            rel.status = sh.Shareholder_Status__c;
            rel.ownerType = sh.Shareholder__r.Owner_Type__pc;
            rel.email = sh.Shareholder__r.Email__c;
            rel.mobileNo = sh.Shareholder__r.Phone_Number__c;
            rel.relAccId = sh.Shareholder__c;
            relationshipList.add(rel);
        }
        for(UBO__c ubo : uboList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = ubo.id;
            rel.name = ubo.UBO__r.Name;
            rel.role = 'UBO';
            rel.passportNumber = (String.isNotBlank(ubo.UBO_Type__c) && ubo.UBO_Type__c == 'Individual') ? ubo.UBO__r.Passport_No__c  : ubo.UBO__r.Commercial_Registration_Number__c;
            //rel.passportExpiryDate = sh.Shareholder__r.Passport_Expiry_Date__pc;
            passportExpDt = ubo.UBO__r.Passport_Expiry_Date__pc;
            rel.passportExpiryDate = (passportExpDt != null) ? (DateTime.newInstance(passportExpDt.year(),passportExpDt.month(),passportExpDt.day()).format('MMM dd,YYYY')) : '' ; 
            rel.nationality = (String.isNotBlank(ubo.UBO_Type__c) && ubo.UBO_Type__c == 'Individual') ? ubo.UBO__r.Customer_Nationality__r.name  : ubo.UBO__r.Country_of_Origin__r.name;
            rel.status = ubo.Status__c;
            rel.ownerType = ubo.UBO_Type__c;
            rel.email = ubo.UBO__r.Email__c;
            rel.mobileNo = ubo.UBO__r.Phone_Number__c;
            rel.relAccId = ubo.UBO__c;
            relationshipList.add(rel);
        }
        wrapper.relationshipList = relationshipList;
        //wrapper.amendmentList = [SELECT Id, Full_Name__c, Passport_Number__c, Role__c,Status__c,Onboard_Request__c FROM OB_Amendment__c WHERE Onboard_Request__c = :recordId AND (Status__c = 'New')];
        return wrapper;
    } */
    
   /* @AuraEnabled(cacheable=false)
    public static String updateSRDocuments(String recordId){
      String res = 'Success';
       try{
         List<Onboard_Request__c> onbList = [select id,Action_Template__r.acbox__Unique_Code__c from Onboard_Request__c where id=:recordId];
         if(onbList != null && !onbList.isEmpty() ){
           ds_PortalOnboardingUtilityClass.processDocuments(onbList[0].Id,onbList[0].Action_Template__r.acbox__Unique_Code__c);           
         }
      }
      catch(Exception ex){
         res = 'Error:'+ ex.getMessage();
      }
      return  res;  
    } */
    /*
    @AuraEnabled(cacheable=false)
    public static String updateServiceRequest(String recordId){
      String res = 'Success';
      try{
         List<Onboard_Request__c> srList = [select id,CID_Entry_Check__c,Share_Capital__c,Account_Name__r.Number_of_Shares__c,(select id,No_of_shares__c,Owner_Type__c from Onboarding_Licensing_Amendments__r where Status__c='New') from Onboard_Request__c where id=:recordId];
         if(srList != null && !srList.isEmpty() && srList[0].Onboarding_Licensing_Amendments__r != null && !srList[0].Onboarding_Licensing_Amendments__r.isEmpty()){
              Onboard_Request__c obr = srList[0];
              integer srShareCapital = Integer.valueOf(obr.Share_Capital__c);
              integer shareCapital = 0;
              for(OB_Amendment__c oba : obr.Onboarding_Licensing_Amendments__r){
                  if(String.isNotBlank(oba.Owner_Type__c) && oba.Owner_Type__c == 'Individual' ){
                      obr.CID_Entry_Check__c = true;
                  }
                  if(oba.No_of_shares__c != null && oba.No_of_shares__c != 0)
                   shareCapital = shareCapital + Integer.valueOf(oba.No_of_shares__c);
              }
              if(shareCapital != 0){
                  obr.Share_Capital__c = obr.Account_Name__r.Number_of_Shares__c + shareCapital;
              }
              if(obr.CID_Entry_Check__c || shareCapital != 0){
                  update obr;
              }
             if(srShareCapital == 0 || srShareCapital != obr.Share_Capital__c){
                 List<acbox__Request_Document__c> rqDocLst = [select id,acbox__Status__c from acbox__Request_Document__c where Onboard_Request__c=:obr.id and acbox__Action_Document__r.acbox__Unique_Key__c='AOAIncShrCp'];
                 if(rqDocLst != null && !rqDocLst.isEmpty()){
                   rqDocLst[0].acbox__Status__c = 'Regenerate';
                   update rqDocLst; 
                 }
             }
         }
      }
      catch(Exception ex){
         res = 'Error:'+ ex.getMessage();
      }
      return  res;
    }
    */
    @AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper getExistingAndNewAmmendmentRecords(String recordId,string role){
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        List<RelationShipWrapper> relationshipList = new List<RelationShipWrapper>();
        List<Directorship__c> dirList = new List<Directorship__c>();
        List<Management_Member__c> mgrList = new List<Management_Member__c>();
        List<Share_Ownership__c> shrList = new List<Share_Ownership__c>(); 
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:recordId]; 
        if(String.isNotBlank(role) && role == 'Manager'){
          mgrList = [Select Id,Company__c,Manager__r.name From Management_Member__c where Company__c=:obrList[0].Account_Name__c and Manager_Status__c='Active'];
          for(Management_Member__c mgr : mgrList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = mgr.Id;
            rel.name = mgr.Manager__r.name; 
            relationshipList.add(rel);
          }
        }
        else if(String.isNotBlank(role) && role == 'Shareholder') {
          shrList = [Select Id,Company__c,Shareholder__r.name From Share_Ownership__c where Company__c=:obrList[0].Account_Name__c and Shareholder_Status__c='Active'];
          for(Share_Ownership__c sh : shrList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = sh.Id;
            rel.name = sh.Shareholder__r.name; 
            relationshipList.add(rel);
          }
        }
         else{
          dirList = [Select Id,Company__c,Director__r.name From Directorship__c where Company__c=:obrList[0].Account_Name__c and Roles__c=:role and Director_Status__c='Active'];
          for(Directorship__c dr : dirList){
            RelationShipWrapper rel = new RelationShipWrapper();
            rel.recid = dr.Id;
            rel.name = dr.Director__r.name; 
            relationshipList.add(rel);
          }
        } 
        
        wrapper.relationshipList = relationshipList;
        //wrapper.relationshipsList =[Select Id,Company__c,Director__c,Directorship_End_Date__c,Roles__c,Directorship_Start_Date__c,Director_Status__c,Director__r.Passport_No__c,Director__r.Name,Director__r.Owner_Type__pc From Directorship__c where Company__c=:obrList[0].Account_Name__c and Roles__c=:role and Director_Status__c='Active'];
        wrapper.amendmentList = [SELECT Id, Full_Name__c, Passport_Number__c, Role__c,Status__c,Onboard_Request__c FROM OB_Amendment__c WHERE Onboard_Request__c = :recordId AND Status__c in ('New','Existing','Remove')];
        return wrapper;
    }
      @AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper getExistingAndNewAmmendmentRecordsWithRole(String recordId){
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        wrapper.amendmentList = [SELECT Id, Full_Name__c, Passport_Number__c, Role__c,Status__c,Onboard_Request__c,Service_Type__c,Owner_Type__c,Status_of_BO_Ownership__c FROM OB_Amendment__c WHERE Onboard_Request__c = :recordId ];
        return wrapper;
    }
    @AuraEnabled(cacheable=false)
    public static Boolean duplicateRecordCheck(String recId,string role,String passportNumber,String emailAddress){
        System.debug('Sai1950==='+recId+role+passportNumber+emailAddress);
        List<Relationships__c> relList = new List<Relationships__c>();
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:recId]; 
        relList =[Select Id,Account__c,Relationship_Account__c,Active__c,End_Date__c,Relationship_Type__c,Start_Date__c,Status__c,Relationship_Account__r.Passport_No__c,Relationship_Account__r.Name,Relationship_Account__r.Email__c From Relationships__c where Account__c=:obrList[0].Account_Name__c and Relationship_Type__c=:role and Status__c='Active' AND Relationship_Account__r.Passport_No__c = :passportNumber
              AND Relationship_Account__r.Email__c = :emailAddress];
               System.debug('Sai1950relList==='+relList);
        return relList.isEmpty();
    }
    
    @AuraEnabled(cacheable=false)
    public static Boolean duplicateAmendmentRecordCheck(String recId,string role,String passportNumber, string amendmentId){
       system.debug('amendmentId--->'+amendmentId);
       List<OB_Amendment__c> amendmentList = new List<OB_Amendment__c>();
       Boolean isduplicate = false;
       if(amendmentId !=null){
        isduplicate = false;
       }else{
        amendmentList =[Select Id,Role__c FROM OB_Amendment__c WHERE Onboard_Request__c=:recId AND Status__c='New' AND Passport_Number__c=:passportNumber];
       }   
       System.debug('amendmentList---->'+amendmentList);
       if(amendmentList.size() > 0) isduplicate = true;    
      return isduplicate;
    }
    
    
    // @AuraEnabled(cacheable=false)
    // public static AmendmentDataWrapper getExistingDirectorsFromAccount(String recordId, string role){
        
    //     AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
    //      Onboard_Request__c onboardRequest = [SELECT Id, Amendments_Created__c FROM Onboard_Request__c WHERE Id = :recordId LIMIT 1];
    //     if (!onboardRequest.Amendments_Created__c) {
    //         List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:recordId]; 
    //         wrapper.relationshipsList =[Select Id,Account__c,Relationship_Account__c,Active__c,End_Date__c,Relationship_Type__c,Start_Date__c,Status__c,Relationship_Account__r.Passport_No__c,Relationship_Account__r.Name From Relationships__c where Account__c=:obrList[0].Account_Name__c and Relationship_Type__c='Director' and Status__c='Active'];
    //         List<OB_Amendment__c> obList = new List<OB_Amendment__c>();
    //         for(Relationships__c rel:wrapper.relationshipsList){
    //             OB_Amendment__c ob = new OB_Amendment__c();
    //             ob.Full_Name__c =rel.Relationship_Account__r.Name;
    //             ob.Passport_Number__c = rel.Relationship_Account__r.Passport_No__c;
    //             ob.Role__c = rel.Relationship_Type__c;
    //             ob.Onboard_Request__c = recordId;
    //             ob.Status__c='Existing';
    //             ob.Owner_Type__c ='Individual';
    //             obList.add(ob);
    //         }
    //         if(obList.size()>0){
    //             insert obList;
    //             wrapper.amendmentList = obList;
    //             onboardRequest.Amendments_Created__c = true;
    //             update onboardRequest;
    //         }
    //     } else {
    //         wrapper.amendmentList = [SELECT Id, Full_Name__c, Passport_Number__c, Role__c,Status__c,Onboard_Request__c FROM OB_Amendment__c WHERE Onboard_Request__c = :recordId AND (Status__c = 'Existing' OR Status__c='Remove')];
    //     }
    //     return wrapper;
    // }
     @AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper  createAmendmentforExistingRelation(List<String> recIds, String reqId,String role,String status){ 
        system.debug('createAmendmentforExistingRelation::'+recIds);
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        wrapper.relationshipsList= [Select Id,Company__c,Director__c,Directorship_End_Date__c,Roles__c,Directorship_Start_Date__c,Director_Status__c,Director__r.Passport_No__c,Director__r.Name,Director__r.Onboarding_Role__c From Directorship__c where Id=:recIds];
        List<OB_Amendment__c> obList = new List<OB_Amendment__c>();
        for(Directorship__c rel:wrapper.relationshipsList){
            OB_Amendment__c ob = new OB_Amendment__c();
            ob.Full_Name__c =rel.Director__r.Name;
            ob.Passport_Number__c = rel.Director__r.Passport_No__c;
            ob.Onboard_Request__c = reqId;
            ob.Status__c= status;   //'Remove';
            if(status == 'Remove')
             ob.Role__c = rel.Roles__c;
            else
             ob.Role__c = role;   //rel.Relationship_Account__r.Onboarding_Role__c+';'+role;
            ob.Owner_Type__c ='Individual';
            ob.RelationShipId__c=rel.Id;
            obList.add(ob);
        }
        if(obList.size()>0){
            insert obList;
            wrapper.amendmentList = obList;
        }
        return wrapper;
    }

     @AuraEnabled(cacheable=false)
    public static AmendmentDataWrapper  createAmendmentforDiretor(String recId, String reqId, String role){ 
        AmendmentDataWrapper wrapper = new AmendmentDataWrapper();
        List<OB_Amendment__c> obList = new List<OB_Amendment__c>();
        String accId = '';
        if(String.isNotBlank(role) && role == 'Manager'){
          List<Management_Member__c> mgrList = [select id,Manager__c from Management_Member__c where Id=:recId];
          if(mgrList != null && !mgrList.isEmpty()){
              accId = mgrList[0].Manager__c;
          }
        }
        else if(String.isNotBlank(role) && role == 'UBO'){
           List<UBO__c> uboList = [select id,UBO__c from UBO__c where Id=:recId];
          if(uboList != null && !uboList.isEmpty()){
              accId = uboList[0].UBO__c;
          }
        }
        else {
            List<Directorship__c> dirList = [select id,Director__c from Directorship__c where Id=:recId];
            if(dirList != null && !dirList.isEmpty()){
              accId = dirList[0].Director__c;
            }
        }
        if(String.isNotBlank(accId)){
         List<Account> accList = [select id,Name,Salutation,Gender__c,FirstName,LastName,Middle_Name__pc,Emirates_ID__c,First_Name_Arabic__c,Middle_Name_Arabic__c,Resident_in_Dubai__pc,
                                  Last_Name_Arabic__c,Passport_No__c,Passport_Place_of_Issue__c,Passport_Issue_date__pc,Passport_Expiry_Date__pc,
                                  Do_you_have_dual_Nationality__c,Secondary_Passport_Number__c,Secondary_Passport_Issue_Date__c,Secondary_Passport_Expiry_Date__c,Secondary_Place_Of_Issue__c,
                                  Are_you_a_Politically_Exposed_Person__c,Type_of_Politically_Exposed_Person__c,Phone_Number__c,Secondary_Mobile_Number__c,
                                  Date_of_Birth__c,Customer_Nationality__c,Place_of_Birth__c,Country_of_Birth__c,Email__c,Address__c,BillingStreet,BillingCity,BillingState,BillingPostalCode,
                                  City_of_P_O_Box__c,isPersonAccount,Stock_Exchange_Government_Entity_Name__c,Commercial_Registration_Number__c from Account where id=:accId];
         if(accList != null && !accList.isEmpty()){
            Account pa = accList[0];
            OB_Amendment__c oba = new OB_Amendment__c();
            oba.Title__c= pa.Salutation;
            oba.Gender__c=pa.Gender__c;
            oba.First_Name__c = pa.FirstName;
            oba.Last_Name__c = pa.LastName;
            oba.Middle_Name__c = pa.Middle_Name__pc;
            oba.Emirates_ID__c = pa.Emirates_ID__c;
            oba.First_Name_Arabic__c = pa.First_Name_Arabic__c;
            oba.Middle_Name_Arabic__c = pa.Middle_Name_Arabic__c;
            oba.Are_you_resident_in_the_UAE__c = pa.Resident_in_Dubai__pc;
            oba.Last_Name_Arabic__c = pa.Last_Name_Arabic__c;
            oba.Passport_Number__c = pa.Passport_No__c;
            oba.Place_Of_Issue__c = pa.Passport_Place_of_Issue__c;
            oba.Passport_Issued_Date__c = pa.Passport_Issue_date__pc;
            oba.Passport_Expiry_Date__c = pa.Passport_Expiry_Date__pc;
            //oba.Passport_Issuing_Country__c = pa.Passport_Issuing_Country__c;
            oba.Do_you_have_dual_Nationality__c = pa.Do_you_have_dual_Nationality__c;
            oba.Secondary_Passport_Number__c = pa.Secondary_Passport_Number__c;
            oba.Secondary_Passport_Issue_Date__c = pa.Secondary_Passport_Issue_Date__c;
            oba.Secondary_Passport_Expiry_Date__c = pa.Secondary_Passport_Expiry_Date__c;
            oba.Secondary_Place_Of_Issue__c = pa.Secondary_Place_Of_Issue__c;
            //oba.Secondary_Passport_Issuing_country__c = pa.Secondary_Passport_Issuing_country__c;
            oba.Are_you_a_Politically_Exposed_Person__c = pa.Are_you_a_Politically_Exposed_Person__c;
            oba.Type_of_Politically_Exposed_Person__c = pa.Type_of_Politically_Exposed_Person__c;
            oba.Primary_Mobile_Number__c = pa.Phone_Number__c;
            oba.Secondary_Mobile_Number__c = pa.Secondary_Mobile_Number__c;
            oba.Date_Of_Birth__c = pa.Date_of_Birth__c;
            oba.Customer_Nationality__c = pa.Customer_Nationality__c;
            oba.Place_Of_Birth__c = pa.Place_of_Birth__c;
            oba.Country_of_Birth__c = pa.Country_of_Birth__c;
            oba.Role__c = role;
            oba.EmailAddress__c = pa.Email__c;
            oba.Address1__c = pa.Address__c;
            oba.Address2__c=pa.BillingStreet;
            oba.City_Town__c = pa.BillingCity;
            oba.State__c = pa.BillingState;
            oba.Po_Box_Postal_Code__c = pa.BillingPostalCode;
            //oba.Country__c = pa.Country_Address__c;
            oba.City_of_P_O_Box__c = pa.City_of_P_O_Box__c;
            oba.Full_Name__c =pa.Name;
            oba.Onboard_Request__c = reqId;
            oba.Status__c= 'Remove';
            oba.Owner_Type__c = (pa.isPersonAccount ? 'Individual' : (String.isBlank(pa.Stock_Exchange_Government_Entity_Name__c) ? 'Corporate' : 'Exception Providing UBO Information'));
            oba.RelationShipId__c=recId;
            oba.Registration_Number__c = pa.Commercial_Registration_Number__c; 
            /*oba.Relationship_Account__c = pa.Director__c;*/
            obList.add(oba);
         }

       }
        if(obList.size()>0){
            insert obList;
            wrapper.amendmentList = obList;
        }
        return wrapper;
    }
    @AuraEnabled(cacheable=false)
    public static ShareholderDataWrapper  createAmendmentforShareholder(String recId, String reqId){ 
        ShareholderDataWrapper wrapper = new ShareholderDataWrapper();
        wrapper.relationshipsList= [Select Id,Company__c,Shareholder__c,Shareholder__r.name,Shareholder__r.Owner_Type__pc,Shareholder_Status__c,Pledge__c,Pledgee__c,Pledge_date__c,Pledge_End_Date__c,Number_of_Pledged_shares__c,Pledge_Share__c From Share_Ownership__c where Id=:recId];
        List<OB_Amendment__c> obList = new List<OB_Amendment__c>();
        for(Share_Ownership__c pa:wrapper.relationshipsList){
            OB_Amendment__c oba = new OB_Amendment__c();

            oba.Full_Name__c = pa.Shareholder__r.name;
            oba.Pledgee_Name__c = pa.Pledgee__c;
            oba.Pledgee_Start_Date__c = pa.Pledge_date__c;
            oba.Pledgee_End_Date__c = pa.Pledge_End_Date__c;
            oba.No_of_Pledged_Shares__c = pa.Number_of_Pledged_shares__c;
            oba.Percentage_of_Pledged_shares__c = pa.Pledge_Share__c;
            oba.Owner_Type__c =pa.Shareholder__r.Owner_Type__pc;
            oba.Onboard_Request__c = reqId;
            oba.Role__c = 'Shareholder';
            oba.Status__c='Remove';
            oba.RelationShipId__c=recId;
            obList.add(oba);
        }
        if(obList.size()>0){
            insert obList;
            wrapper.amendmentList = obList;
        }
        return wrapper;
    }
    public class ShareholderDataWrapper {
        @AuraEnabled
        public List<Share_Ownership__c> relationshipsList { get; set; }
        @AuraEnabled
        public List<OB_Amendment__c> amendmentList { get; set; }
        @AuraEnabled
        public String amendmentType { get; set; }        
    }
    public class AmendmentDataWrapper {
        @AuraEnabled
        public List<Directorship__c> relationshipsList { get; set; }
        @AuraEnabled
        public List<RelationShipWrapper> relationshipList { get; set; }
        @AuraEnabled
        public List<OB_Amendment__c> amendmentList { get; set; }
        @AuraEnabled
        public List<Account> personAccountList { get; set; }
    }
    public class RelationShipWrapper {
        @AuraEnabled
        public String recid { get; set; }
        @AuraEnabled
        public String name { get; set; }
        @AuraEnabled
        public String role { get; set; }
        @AuraEnabled
        public String passportNumber { get; set; }
        @AuraEnabled
        public String status { get; set; }
        @AuraEnabled
        public String ownerType { get; set; }
        @AuraEnabled
        public String email { get; set; }
        @AuraEnabled
        public String mobileNo { get; set; }
        @AuraEnabled
        public String relAccId { get; set; }
        @AuraEnabled
        public String passportExpiryDate { get; set; }
        @AuraEnabled
        public String nationality { get; set; }
    } 
    public class AmendmentReviewWrapper {
        @AuraEnabled
        public String recid { get; set; }
        @AuraEnabled
        public String name { get; set; }
         @AuraEnabled
        public String recLink { get; set; }
        @AuraEnabled
        public String role { get; set; }
        @AuraEnabled
        public String passportNumber { get; set; }
        @AuraEnabled
        public String status { get; set; }
        @AuraEnabled
        public String updatedSection { get; set; }
        @AuraEnabled
        public Boolean isUpdateMember { get; set; }
        @AuraEnabled
        public String documentLink { get; set; }
        @AuraEnabled
        public String updatingSection { get; set; }
         @AuraEnabled
        public String templateDescription { get; set; }
        @AuraEnabled
        public String pledgeeName { get; set; }
        @AuraEnabled
        public String pledgeeStartDate { get; set; }
        @AuraEnabled
        public String pledgeeEndDate { get; set; }
        @AuraEnabled
        public integer noofPledgeShares { get; set; }
        @AuraEnabled
        public String shareholderType { get; set; }
        @AuraEnabled
        public integer noofShares { get; set; }
        @AuraEnabled
        public integer noofTransferShares { get; set; }
        @AuraEnabled
        public String shareTransferType { get; set; }
        @AuraEnabled
        public String fromShareholder { get; set; }
         @AuraEnabled
        public String toShareholder { get; set; }
        @AuraEnabled
        public String address { get; set; }
        
        
    }
      // Added by Sai kumar Reddy - Start
   @AuraEnabled
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
    public static List<OB_Amendment__c> getGeneralAmmendmentRecord (String requestId) {
        List<OB_Amendment__c> onbAmmList = new List<OB_Amendment__c>();
        OB_Amendment__c obmAmm;
        for(OB_Amendment__c Ob: [SELECT Id,Full_Name__c,Name,Role__c,Passport_Number__c,Status__c,Owner_Type__c,Trade_License_Number__c,Document_Link__c,(SELECT Id, Name FROM Attachments ORDER BY CreatedDate DESC LIMIT 1) FROM OB_Amendment__c WHERE Onboard_Request__c = :requestId and Onboard_Request__r.Action_Template__r.acbox__Unique_Code__c='AddorRemoveDirector'])
        {
            onbAmmList.add(Ob);
        }
        return onbAmmList;
    }
    
  // Added by Sai kumar Reddy - End
    
     @AuraEnabled(cacheable=false)
    public static List<OB_Amendment__c> getExistingShareHoldersData(String onboardRecordId, string role){
       List<String> rolesList = role.split(';');
       String rolesAsString = '(\'' + String.join(rolesList, '\', \'') + '\')';
       String amdRqQuery = 'Select id,Corporate_Account__c,DACC_Registered__c,Ownership_Percentage__c,Corporate_Account__r.Registration_Number_Value__c,Corporate_Account__r.Name,Onboard_Request__c,Onboard_Request__r.Share_Capital__c,Onboard_Request__r.Account_Name__r.Entity_Type__c,First_Name__c,Are_you_resident_in_the_UAE__c,No_of_shares__c,Transfer_Shares_From__c,To_Shareholder__c,Shares_Transfer_Type__c,No_of_transfer_shares__c,Pledgee_Name__c,Pledgee_Start_Date__c,Pledgee_End_Date__c,No_of_Pledged_Shares__c,Percentage_of_Pledged_shares__c,Address1__c,Address2__c,City__c,City_of_P_O_Box__c,City_Town__c,Country__c, RelationShipId__c,Country_of_Birth__c,Date_Of_Birth__c,Date_of_Issue__c,Do_you_have_dual_Nationality__c,Are_you_a_Politically_Exposed_Person__c,EmailAddress__c,Emirates_ID__c,First_Name_Arabic__c,Gender__c,Last_Name_Arabic__c,Middle_Name__c,Middle_Name_Arabic__c,Customer_Nationality__c,Passport_Expiry_Date__c,Owner_Type__c,Passport_Issued_Date__c,Passport_Issuing_Country__c,Passport_Number__c,Place_Of_Birth__c,Place_Of_Issue__c,Po_Box_Postal_Code__c,PostolCode__c,Primary_Mobile_Number__c,Relationship_Account__c,Role__c,Relationships__c,Secondary_Mobile_Number__c,Secondary_Passport_Expiry_Date__c,Secondary_Passport_Issue_Date__c,Secondary_Passport_Issuing_country__c,Secondary_Passport_Number__c,Secondary_Place_Of_Issue__c,State__c,State_Provine_Region__c,Status__c,Street_Address__c,Telephone_No__c,Title__c,Type_of_Politically_Exposed_Person__c,UAE_ID__c,Updating_Section__c,Last_Name__c,Full_Name__c,Document_Link__c,Document_Name__c,Document_Id__c,Service_Type__c,Company_Name__c,Company_Name_Arabic__c,Date_of_Incorporation__c,Place_of_Registration__c,Registration_Number__c,POA_Name__c,Exception_Company_Type__c,Reason_for_Exemption__c,Stock_Exchange_Government_Entity_Name__c,When_this_individual_became_UBO__c,Status_of_BO_Ownership__c,How_this_individual_became_the_UBO__c,Are_you_the_custodian__c,PEP_Other__c FROM OB_Amendment__c Where Onboard_Request__c =\''+onboardRecordId+'\'';
        if(!rolesList.isempty()){
            amdRqQuery = amdRqQuery + ' AND role__c includes'+rolesAsString;
        }
       List<OB_Amendment__c> amdList = Database.query(amdRqQuery);
       return amdList;
       /* return [Select id, First_Name__c,Are_you_resident_in_the_UAE__c,Address1__c,
                Address2__c,
                City__c,
                City_of_P_O_Box__c,
                City_Town__c,
                Country__c,
                RelationShipId__c,
                Country_of_Birth__c,
                Date_Of_Birth__c,
                Date_of_Issue__c,
                Do_you_have_dual_Nationality__c,
                Are_you_a_Politically_Exposed_Person__c,
                EmailAddress__c,Emirates_ID__c,First_Name_Arabic__c,Gender__c,Last_Name_Arabic__c,Middle_Name__c,Middle_Name_Arabic__c,Customer_Nationality__c,
                Passport_Expiry_Date__c,Owner_Type__c,Passport_Issued_Date__c,Passport_Issuing_Country__c,Passport_Number__c,
                Place_Of_Birth__c,Place_Of_Issue__c,Po_Box_Postal_Code__c,PostolCode__c,Primary_Mobile_Number__c,Relationship_Account__c,Role__c,Relationships__c,Secondary_Mobile_Number__c,Secondary_Passport_Expiry_Date__c,Secondary_Passport_Issue_Date__c,Secondary_Passport_Issuing_country__c,
                Secondary_Passport_Number__c,Secondary_Place_Of_Issue__c,State__c,State_Provine_Region__c,Status__c,Street_Address__c,
                Telephone_No__c,Title__c,Type_of_Politically_Exposed_Person__c,UAE_ID__c,Updating_Section__c,
                Last_Name__c,Full_Name__c,Document_Link__c,Document_Name__c,Document_Id__c,Service_Type__c FROM OB_Amendment__c Where Onboard_Request__c =: onboardRecordId AND role__c IN :rolesList];
        */
    }
    
    @AuraEnabled(cacheable=false)
    public static List<OB_Amendment__c> getRelatedRecords(String onboardRecordId){
        return [Select id,First_Name__c,Are_you_resident_in_the_UAE__c,Address1__c,
                Address2__c,
                City__c,
                RelationShipId__c,
                City_of_P_O_Box__c,
                City_Town__c,
                Country__c,
                Country_of_Birth__c,
                Date_Of_Birth__c,
                Date_of_Issue__c,
                Do_you_have_dual_Nationality__c,
                Are_you_a_Politically_Exposed_Person__c,
                EmailAddress__c,Emirates_ID__c,First_Name_Arabic__c,Gender__c,Last_Name_Arabic__c,Middle_Name__c,Middle_Name_Arabic__c,Customer_Nationality__c,
                Passport_Expiry_Date__c,Owner_Type__c,Passport_Issued_Date__c,Passport_Issuing_Country__c,Passport_Number__c,
                Place_Of_Birth__c,Place_Of_Issue__c,Po_Box_Postal_Code__c,PostolCode__c,Primary_Mobile_Number__c,Relationship_Account__c,Role__c,Relationships__c,Secondary_Mobile_Number__c,Secondary_Passport_Expiry_Date__c,Secondary_Passport_Issue_Date__c,Secondary_Passport_Issuing_country__c,
                Secondary_Passport_Number__c,Secondary_Place_Of_Issue__c,State__c,State_Provine_Region__c,Status__c,Street_Address__c,No_of_Shares__c,
                Telephone_No__c,Title__c,Type_of_Politically_Exposed_Person__c,UAE_ID__c,Updating_Section__c,
                Company_Name__c,Company_Name_Arabic__c,Date_of_Incorporation__c,Place_of_Registration__c,Registration_Number__c,POA_Name__c,
                Last_Name__c,Full_Name__c,FullName__c,Document_Id__c,Document_Name__c,Document_Link__c,Service_Type__c FROM OB_Amendment__c Where Onboard_Request__c =: onboardRecordId AND Owner_Type__c = 'Individual'];
    }

    @AuraEnabled(cacheable=false)
    public static List<OB_Amendment__c> getSelectedRelationInfo(String relationId){
       List<OB_Amendment__c> obAmendList = new List<OB_Amendment__c>();
       List<Account> accList =  [select id,Name,Arabic_Account_Name__c,PersonTitle,FirstName,LastName,Owner_Type__c,Current_Passport__r.Name,Current_Passport__r.Passport_Place_of_Issue__c,Current_Passport__r.Passport_Issue_Date__c,
          Gender__c,Middle_Name__pc,UAE_Id__c,First_Name_Arabic__c,Middle_Name_Arabic__c,Resident_in_Dubai__pc,Phone,Mobile__c,
          PersonBirthdate,Place_of_Birth__c,BoardMember_Role__c,Email__c,Address__c,Last_Name_Arabic__c, Current_Passport__r.Passport_Expiry_Date__c,
          Current_Passport__r.Passport_Issue_Country__c,Do_you_have_dual_Nationality__c,Current_Passport__r.Secondary_Passport_Number__c,Current_Passport__r.Secondary_Passport_Issue_Date__c,
          Current_Passport__r.Secondary_Passport_Expiry_Date__c,Current_Passport__r.Secondary_Place_Of_Issue__c,Current_Passport__r.Secondary_Passport_Issuing_country__c,Are_you_a_Politically_Exposed_Person__c,
          Type_of_Politically_Exposed_Person__c,Customer_Nationality__c,Country_of_Birth__c,Building_Villa_Flat__c,Street_Name__c,Area__c,City_Town__c,Country_Address__c,Billing_PO_Box_Postal_Code__c,
          Company_Registration_Date__c,Country_of_Origin__c,Registration_Number_Value__c,Company_Representative__c,In_Out__c,U_I_D_NO__c,IsPersonAccount,
          Company_Representative_Email__c,Company_Representative_Phone_Number__c,Company_Representative_Passport_Number__c,Company_Representative_Emirates_Id__c,Company_License_Issue_Date__c,Company_License_Expiry_Date__c,Document_Link__c,Document_Id__c,Document_Name__c
          FROM Account where Agent_Ref__c=:relationId AND BoardMember_Role__c = 'Manager'];

      if(accList != null && !accList.isEmpty()){
        List<ContentVersion> cvList = [SELECT id FROM ContentVersion WHERE ContentDocumentId=:accList[0].Document_Id__c];
        Account pa = accList[0];
           OB_Amendment__c obA = new OB_Amendment__c();
            obA.Title__c= pa.PersonTitle;
            obA.Gender__c=pa.Gender__c;
            obA.First_Name__c = pa.FirstName;
            obA.Last_Name__c = pa.LastName;
            obA.Middle_Name__c = pa.Middle_Name__pc;
            obA.Full_Name__c = (pa.IsPersonAccount ? ((String.isNotBlank(pa.FirstName) ? pa.FirstName : '') + (String.isNotBlank(pa.Middle_Name__pc) ?  ' '+pa.Middle_Name__pc : '') + (String.isNotBlank(pa.LastName) ?  ' '+pa.LastName : '')) :  pa.name);
            obA.In_Out__c = pa.In_Out__c;
            if(String.isNotBlank(pa.U_I_D_NO__c)){
                obA.Are_you_a_national_of_the_UAE__c = 'Yes';
                obA.U_I_D_NO__c = pa.U_I_D_NO__c; 
            }
            else
                obA.Are_you_a_national_of_the_UAE__c = 'No';
            
            obA.First_Name_Arabic__c = pa.First_Name_Arabic__c;
            obA.Middle_Name_Arabic__c = pa.Middle_Name_Arabic__c;
            obA.Are_you_resident_in_the_UAE__c = ((String.isNotBlank(pa.UAE_Id__c) || String.isNotBlank(pa.Company_Representative_Emirates_Id__c))?'Yes':'No');
            obA.Last_Name_Arabic__c = pa.Last_Name_Arabic__c;
            obA.Passport_Number__c = pa.Current_Passport__r.Name;
            obA.Place_Of_Issue__c = pa.Current_Passport__r.Passport_Place_of_Issue__c;
            obA.Passport_Issued_Date__c = pa.Current_Passport__r.Passport_Issue_Date__c;
            obA.Passport_Expiry_Date__c = pa.Current_Passport__r.Passport_Expiry_Date__c;
            obA.Passport_Issuing_Country__c = pa.Current_Passport__r.Passport_Issue_Country__c;
            obA.Do_you_have_dual_Nationality__c = (String.isNotBlank(pa.Do_you_have_dual_Nationality__c)?pa.Do_you_have_dual_Nationality__c:'No');
            obA.Secondary_Passport_Number__c = pa.Current_Passport__r.Secondary_Passport_Number__c;
            obA.Secondary_Passport_Issue_Date__c = pa.Current_Passport__r.Secondary_Passport_Issue_Date__c;
            obA.Secondary_Passport_Expiry_Date__c = pa.Current_Passport__r.Secondary_Passport_Expiry_Date__c;
            obA.Secondary_Place_Of_Issue__c = pa.Current_Passport__r.Secondary_Place_Of_Issue__c;
            obA.Secondary_Passport_Issuing_country__c = pa.Current_Passport__r.Secondary_Passport_Issuing_country__c;
            obA.Are_you_a_Politically_Exposed_Person__c = (String.isNotBlank(pa.Are_you_a_Politically_Exposed_Person__c)? pa.Are_you_a_Politically_Exposed_Person__c : 'No');
            obA.Type_of_Politically_Exposed_Person__c = pa.Type_of_Politically_Exposed_Person__c;
            
            obA.Secondary_Mobile_Number__c = pa.Mobile__c;
            obA.Date_Of_Birth__c = pa.PersonBirthdate;
            obA.Customer_Nationality__c = pa.Customer_Nationality__c;
            obA.Place_Of_Birth__c = pa.Place_of_Birth__c;
            obA.Country_of_Birth__c = pa.Country_of_Birth__c;
            obA.Role__c = pa.BoardMember_Role__c;
            if(obA.Role__c == 'Manager')
            obA.Is_Manager__c = true;
            //obA.Emirates_ID__c = pa.Company_Representative_Emirates_Id__c;
            obA.EmailAddress__c = pa.Email__c;
            obA.Primary_Mobile_Number__c = pa.Phone;
            obA.Address2__c = pa.Building_Villa_Flat__c;
            obA.Street_Address__c = pa.Street_Name__c;
            obA.Address1__c = pa.Area__c;
            obA.City__c = pa.City_Town__c;
            obA.Po_Box_Postal_Code__c = pa.Billing_PO_Box_Postal_Code__c;
            obA.Country__c = pa.Country_Address__c;
            obA.City_of_P_O_Box__c = '';
            obA.Owner_Type__c = (pa.IsPersonAccount ? 'Individual' : 'Corporate');
            obA.Company_Name__c = pa.Name;
            obA.Company_Name_Arabic__c = pa.Arabic_Account_Name__c;
            obA.Date_of_Incorporation__c = pa.Company_Registration_Date__c;
            obA.Place_of_Registration__c = pa.Country_of_Origin__c;
            obA.Registration_Number__c = pa.Registration_Number_Value__c;
            obA.License_Issue_Date__c = pa.Company_License_Issue_Date__c;
            obA.License_Expiry_Date__c = pa.Company_License_Expiry_Date__c;
            if(!pa.IsPersonAccount){
                obA.POA_Name__c = pa.Company_Representative__c;
                obA.POC_Passport_Number__c = pa.Company_Representative_Passport_Number__c;
            }
            obA.Relationship_Account__c = pa.id;
            obA.Document_Link__c = pa.Document_Link__c;
            obA.Document_Id__c = pa.Document_Id__c;
            obA.Document_Name__c = pa.Document_Name__c;
            if(!cvList.isEmpty()){
                obA.Content_Version_Id__c = cvList[0].Id;
            }
            obAmendList.add(obA);
       }   
        return obAmendList;
    }   
    
    //Added by Vinod for choose from people for company registratoin - Start    
    @AuraEnabled(cacheable=false)
    public static List<OB_Amendment__c> getSelectedAmendementInfo(String relationId){
        String objectName = 'OB_Amendment__c';
       List<OB_Amendment__c> obAmendList = new List<OB_Amendment__c>();
       List<OB_Amendment__c> amendmentList =  new List<OB_Amendment__c>();
       /*amendmentList = [select id,Onboard_Request__c,Title__c,Gender__c,First_Name__c,Last_Name__c,Middle_Name__c,Full_Name__c,Emirates_ID__c,First_Name_Arabic__c,
       Middle_Name_Arabic__c,Last_Name_Arabic__c,Are_you_resident_in_the_UAE__c,Passport_Number__c,Place_Of_Issue__c,Passport_Issued_Date__c,Passport_Expiry_Date__c,
       Passport_Issuing_Country__c,Do_you_have_dual_Nationality__c,Secondary_Passport_Number__c,Secondary_Passport_Issue_Date__c,Secondary_Passport_Expiry_Date__c,
       Secondary_Place_Of_Issue__c,Secondary_Passport_Issuing_country__c,Are_you_a_Politically_Exposed_Person__c,Type_of_Politically_Exposed_Person__c,Primary_Mobile_Number__c,
       Secondary_Mobile_Number__c,Date_Of_Birth__c,Customer_Nationality__c,Place_Of_Birth__c,Country_of_Birth__c,Role__c,EmailAddress__c,Address1__c,Address2__c,City__c,Street_Address__c,
       State__c,Po_Box_Postal_Code__c,Country__c,City_of_P_O_Box__c,Owner_Type__c,Company_Name__c,Company_Name_Arabic__c,Date_of_Incorporation__c,Place_of_Registration__c,
       Registration_Number__c,POA_Name__c,FullName__c,Document_Name__c,Document_Link__c
       FROM OB_Amendment__c where id=:relationId]; */
       // Get the describe result for the given object
        Schema.SObjectType sObjectType = Schema.getGlobalDescribe().get(objectName);
        Schema.DescribeSObjectResult describeResult = sObjectType.getDescribe();
        // Get all field names
        List<String> fieldNames = new List<String>();
        for(Schema.SObjectField field : describeResult.fields.getMap().values()) {
            fieldNames.add(field.getDescribe().getName());
        }
        // Construct the dynamic query with all field names
        String queryString = 'SELECT ' + String.join(fieldNames, ', ') + ' FROM ' + objectName+ ' WHERE Id=:relationId';
        // Execute the dynamic query and return the list of SObjects
       amendmentList = Database.query(queryString);
       return amendmentList;
     /* if(amendmentList != null && !amendmentList.isEmpty()){
           OB_Amendment__c pa = amendmentList[0];
           OB_Amendment__c oba = new OB_Amendment__c();
            oba.Title__c= pa.Title__c;
            oba.Gender__c=pa.Gender__c;
            oba.First_Name__c = pa.First_Name__c;
            oba.Last_Name__c = pa.Last_Name__c;
            oba.Middle_Name__c = pa.Middle_Name__c;
            oba.Full_Name__c = pa.Full_Name__c;
            oba.Emirates_ID__c = pa.Emirates_ID__c;
            oba.First_Name_Arabic__c = pa.First_Name_Arabic__c;
            oba.Middle_Name_Arabic__c = pa.Middle_Name_Arabic__c;
            oba.Are_you_resident_in_the_UAE__c = pa.Are_you_resident_in_the_UAE__c;
            oba.Last_Name_Arabic__c = pa.Last_Name_Arabic__c;
            oba.Passport_Number__c = pa.Passport_Number__c;
            oba.Place_Of_Issue__c = pa.Place_Of_Issue__c;
            oba.Passport_Issued_Date__c = pa.Passport_Issued_Date__c;
            oba.Passport_Expiry_Date__c = pa.Passport_Expiry_Date__c;
            oba.Passport_Issuing_Country__c = pa.Passport_Issuing_Country__c;
            oba.Do_you_have_dual_Nationality__c = pa.Do_you_have_dual_Nationality__c;
            oba.Secondary_Passport_Number__c = pa.Secondary_Passport_Number__c;
            oba.Secondary_Passport_Issue_Date__c = pa.Secondary_Passport_Issue_Date__c;
            oba.Secondary_Passport_Expiry_Date__c = pa.Secondary_Passport_Expiry_Date__c;
            oba.Secondary_Place_Of_Issue__c = pa.Secondary_Place_Of_Issue__c;
            oba.Secondary_Passport_Issuing_country__c = pa.Secondary_Passport_Issuing_country__c;
            oba.Are_you_a_Politically_Exposed_Person__c = pa.Are_you_a_Politically_Exposed_Person__c;
            oba.Type_of_Politically_Exposed_Person__c = pa.Type_of_Politically_Exposed_Person__c;
            oba.Primary_Mobile_Number__c = pa.Primary_Mobile_Number__c;
            oba.Secondary_Mobile_Number__c = pa.Secondary_Mobile_Number__c;
            oba.Date_Of_Birth__c = pa.Date_of_Birth__c;
            oba.Customer_Nationality__c = pa.Customer_Nationality__c;
            oba.Place_Of_Birth__c = pa.Place_of_Birth__c;
            oba.Country_of_Birth__c = pa.Country_of_Birth__c;
            oba.Role__c = pa.Role__c;
            oba.EmailAddress__c = pa.EmailAddress__c;
            oba.Address1__c = pa.Address1__c;
            oba.Address2__c=pa.Address2__c;
            oba.City__c = pa.City__c;
            oba.Street_Address__c = pa.Street_Address__c;
            oba.State__c = pa.State__c;
            oba.Po_Box_Postal_Code__c = pa.Po_Box_Postal_Code__c;
            oba.Country__c = pa.Country__c;
            oba.City_of_P_O_Box__c = pa.City_of_P_O_Box__c;
            oba.Owner_Type__c = pa.Owner_Type__c;
            oba.Company_Name__c = pa.Company_Name__c;
            oba.Company_Name_Arabic__c = pa.Company_Name_Arabic__c;
            oba.Date_of_Incorporation__c = pa.Date_of_Incorporation__c;
            oba.Place_of_Registration__c = pa.Place_of_Registration__c;
            oba.Registration_Number__c = pa.Registration_Number__c;
            oba.POA_Name__c = pa.POA_Name__c;
            oba.Onboard_Request__c = pa.Onboard_Request__c;
           obAmendList.add(oba);
       }  
        return obAmendList;*/
    }
    //Vinod changes -  end
    
    /*@AuraEnabled
    public static OCRWrapper getDocumentOCR(String conVersionID){
        ContentVersion version = [SELECT ID, VersionData, FileExtension FROM ContentVersion WHERE Id = :conVersionID];
        BizFlow_OCRDocumentInfo.OCRWrapper ocrData= BizFlow_OCRDocumentInfo.getDocumentinformation(EncodingUtil.Base64Encode(version.VersionData), 'Passport', version.FileExtension);
        System.debug('ocrData--->'+ocrData);
        OCRWrapper ocrFields = new OCRWrapper();
        ocrFields.emiratesIDDateofExpiry = ocrData.emiratesIDDateofExpiry;
        ocrFields.firstName = ocrData.firstName;
        ocrFields.lastName = ocrData.lastName;
        ocrFields.nationality = getCountryLookup(ocrData.nationality);
        ocrFields.passportDateofExpiry = ocrData.passportDateofExpiry;
        ocrFields.passportNo = ocrData.passportNo;
        ocrFields.placeofissue = ocrData.placeofissue;
        ocrFields.emiratesIDName = ocrData.emiratesIDName;
        ocrFields.emiratesIDNo = ocrData.emiratesIDNo;
        ocrFields.dateOfBirth = ocrData.dateOfBirth;
        ocrFields.passportDateofIssue = ocrData.passportDateofIssue;
        if(ocrData.gender == 'F'){
            ocrFields.gender = 'Female';
        }
        if(ocrData.gender == 'M'){
            ocrFields.gender = 'Male';
        }
        ocrFields.isValidDocument = ocrData.isValidDocument;
        ocrFields.errorMessage = ocrData.errorMessage;
        ocrFields.docUrl = createContentDistribution(conVersionID,ocrFields.firstName+ocrFields.lastName);
        return ocrFields;
    }*/
    @AuraEnabled
    public static string getDocumentOCR(String conVersionID){
        ContentVersion version = [SELECT ID,title, VersionData, FileExtension,PathOnClient FROM ContentVersion WHERE Id=:conVersionID];
        String fileName = String.isNotBlank(version.title) ?  (version.title).replace('.','') : 'Passport';
       /*BizFlow_OCRDocumentInfo.OCRWrapper ocrData= BizFlow_OCRDocumentInfo.getDocumentinformation(EncodingUtil.Base64Encode(version.VersionData), 'Passport', version.FileExtension);
        system.debug('ocrData--->'+ocrData);
        if(ocrData.Country !=null){
           ocrData.nationality = getCountryLookup(ocrData.Country);  
        }
        if(ocrData != null){
            if(ocrData.Sex == 'F'){
                ocrData.Sex = 'Female';
            }
            if(ocrData.Sex == 'M'){
                ocrData.Sex = 'Male';
            }
            ocrData.docUrl = createContentDistribution(conVersionID,ocrData.FirstName+ocrData.LastName);
        }
         system.debug('===ocrData==='+ocrwrapper);
        return JSON.serialize(ocrData);
        */
        DS_OCRDocumentInfo.OCRWrapper ocrwrapper = DS_OCRDocumentInfo.getDocumentDetailsAPI(version, 'passportsIds', '');
        system.debug('ocrwrapper--->'+ocrwrapper);
        if(ocrwrapper != null){
            if(ocrwrapper.CountryShort != null){
                string countryId = getCountryLookup(ocrwrapper.CountryShort);
                if(String.isNotBlank(countryId)) {
                    ocrwrapper.Country = ocrwrapper.Nationality = countryId;
                }else{
                    ocrwrapper.Country = ocrwrapper.Nationality = null;
                }
            }
            if(ocrwrapper.Gender == 'M'){
                ocrwrapper.Gender = 'Male';
            }else if(ocrwrapper.Gender == 'F'){
                ocrwrapper.Gender = 'Female';
            }
            fileName = (String.isNotBlank(ocrwrapper.FirstName) ? (ocrwrapper.FirstName+' ') : '')+(String.isNotBlank(ocrwrapper.LastName) ? ocrwrapper.LastName : '');
           // ocrwrapper.docUrl = createContentDistribution(conVersionID,ocrwrapper.FirstName+ocrwrapper.LastName);
        }
        system.debug('===ocrwrapper==='+ocrwrapper);
        return JSON.serialize(ocrwrapper);
    }
    public static string getCountryLookup(string con) {
        if(con == 'ARE'){
            con = 'UAE';
        }
        for(Country__c country : [SELECT id, Alpha_3_Code__c FROM Country__c WHERE Alpha_3_Code__c = :con AND Valid_Country__c = true LIMIT 1]){
            return country.Id;
        }
        return null;
    }
    /*public static String getCountryLookup(String countryName){
        String countryId;
        List<Country__c> conList= new List<Country__c>();
         if(String.isNotBlank(countryName)){
             conList =[select id,Name FROM Country__c where Name=:countryName LIMIT 1];
             if(conList.size()>0){
                 countryId=conList[0].Id;
             }else{
                 countryId='';
             }
         }
         return countryId;
    }*/
    public static void deregisterAccount(String reqId){
        List<Onboard_Request__c> obrList = [Select id,Account_Name__c from Onboard_Request__c where Id=:reqId];
        List<Visa__c> visaList = new List<Visa__c>();
        Account acc = new Account();
        License__c lic = new License__c();
        if(obrList != null && !obrList.isEmpty()){
            //Get Under Dergistration Record Type Id
            RecordType accountRecordType = [select id from RecordType where SObjectType='Account' and Name = 'DWC Account - Under Deregistration' ];
            RecordType liccancellRecordType = [select id from RecordType where SObjectType='License__c' and Name = 'Cancelled' ];
            RecordType licundercancellRecordType = [select id from RecordType where SObjectType='License__c' and Name = 'Under Cancellation' ];
            visaList =[Select id,Sponsoring_Company__c,Visa_Validity_Status__c from Visa__c where Sponsoring_Company__c =: obrList[0].Account_Name__c and Visa_Validity_Status__c NOT IN ('Cancelled','Rejected','Renewed','Under Cancellation')];
            lic =[Select Id,RecordTypeId from License__c where Licensed_Company__c=:obrList[0].Account_Name__c and Validity_Status__c ='Active'];
            acc =[Select Id,Is_Establishment_Card_Applicable__c from Account where Id=:obrList[0].Account_Name__c];
            //Mark Account as Under Deregistration
            // Account accountObject = [select RecordTypeId , Application_Deregistration_Approval_St__c from Account where Id = :obrList[0].Account_Name__c];
            // accountObject.RecordTypeId                               = accountRecordType.id ;
            // accountObject.Application_Deregistration_Approval_St__c  = 'Not Submitted' ;
            // update accountObject ;
            
            /*
            if(acc.Is_Establishment_Card_Applicable__c == 'Yes'){
                Onboard_Request__c obrreq = new Onboard_Request__c(Account_Name__c=obrList[0].Account_Name__c,
                                                                   Action_Template__c=system.label.EstablishmentCardActionTemplate,
                                                                   Status__c='Draft',
                                                                   recordtypeid=system.label.ObrEstablishmentCardRecordType);
                insert obrreq;
                obrreq.Status__c = 'Submitted';
                obrreq.Establishment_Card_Request__c = reqId;
                update obrreq;
            }
            
            if(visaList.size()>0){
                lic.RecordTypeId = licundercancellRecordType.Id;
            }else{
                lic.RecordTypeId=liccancellRecordType.Id;
            }
            update lic;
            */
        }
        obrList[0].Is_Visa_s_Cancelled__c = 'Yes';
        if(obrList.size()>0){
            update obrList;
        } 
        
    }
     public static void updateLicenseActivities(String reqId){
       List<License_Activity__c> newActList = new List<License_Activity__c>();
       Set<String> actIdRemoveLst = new Set<String>();
       boolean isMainActUpdated = false;
       String licId = null;
       for(OB_License_Activity__c obAct : [select id,Main_Activity__c,LicenseActivityId__c,Business_Activity__c,Business_Activity__r.Name,
                                         Business_Activity__r.Business_Activity_Name__c,Business_Activity__r.Business_Activity_Name_Arabic__c,Business_Activity__r.License_Type__c,Business_Activity__r.isGeneralTrading__c,Onboard_Request__r.Account_Name__r.Current_License_Number__c from OB_License_Activity__c where Onboard_Request__c=:reqId]){
          licId = obAct.Onboard_Request__r.Account_Name__r.Current_License_Number__c;
          if(String.isNotBlank(obAct.LicenseActivityId__c)){
              actIdRemoveLst.add(obAct.Business_Activity__c);
          }
          else{
            License_Activity__c act = new License_Activity__c();
            act.Name = obAct.Business_Activity__r.name;
            act.License__c = obAct.Onboard_Request__r.Account_Name__r.Current_License_Number__c;
            act.License_Activity_Name__c =  obAct.Business_Activity__r.Business_Activity_Name__c; 
            act.License_Activity_Name_Arabic__c = obAct.Business_Activity__r.Business_Activity_Name_Arabic__c; 
            act.Original_Business_Activity__c = obAct.Business_Activity__c;
            if(obAct.Main_Activity__c)
            isMainActUpdated = true;
            act.Main_Activity__c = obAct.Main_Activity__c;
            act.Start_Date__c = Date.today();
            act.Approval_Status__c = 'Approved';  
            newActList.add(act);  
          }
       }
      List<License_Activity__c> actList = [select id,Main_Activity__c,End_Date__c,Original_Business_Activity__c from License_Activity__c where License__c=:licId and End_Date__c=null];
      
       for(License_Activity__c act : actList){
          if(isMainActUpdated)
          act.Main_Activity__c = false;
          if(actIdRemoveLst.contains(act.Original_Business_Activity__c))
           act.End_Date__c = Date.today();  
       }
       if(actList != null && !actList.isEmpty())
         update actList;
       if(newActList != null && !newActList.isEmpty()){
           insert newActList;
       } 
    }
    
    public static void createPersonAccountVthRelations(String reqId,Date ApprovedDate){
        List<OB_Amendment__c> obAmendments = [Select Id,POA_Name__c,Owner_Type__c,DACC_Registered__c,Relationship_Account__c,Title__c,RelationShipId__c,First_Name__c,Last_Name__c,Middle_Name__c,Passport_Number__c,
         Place_Of_Issue__c,Emirates_ID__c,Last_Name_Arabic__c,First_Name_Arabic__c,Middle_Name_Arabic__c,Are_you_resident_in_the_UAE__c,Passport_Expiry_Date__c,
         Passport_Issuing_Country__c,Do_you_have_dual_Nationality__c,Secondary_Passport_Number__c,Secondary_Passport_Issue_Date__c,Secondary_Passport_Expiry_Date__c,
         Secondary_Place_Of_Issue__c,Secondary_Passport_Issuing_country__c,Are_you_a_Politically_Exposed_Person__c,Type_of_Politically_Exposed_Person__c,
         Secondary_Mobile_Number__c,Customer_Nationality__c,Country_of_Birth__c,Passport_Issued_Date__c,Gender__c,Primary_Mobile_Number__c,
         Date_Of_Birth__c,Place_Of_Birth__c,Role__c,EmailAddress__c,Address1__c,Address2__c,City_Town__c,State__c,Po_Box_Postal_Code__c,Country__c,City_of_P_O_Box__c,
         No_of_shares__c,Registration_Number__c,Place_of_Registration__c,Company_Name__c,Company_Name_Arabic__c,Date_of_Incorporation__c,Document_Id__c,Document_Link__c,Status_of_BO_Ownership__c FROM OB_Amendment__c where Onboard_Request__c=: reqId and Role__c not in ('Freelancer')];
       
        List<Account> personAccs = new List<Account>();
        List<Account> updatePersonAccs = new List<Account>();
        List<Directorship__c> dirRelationships = new  List<Directorship__c>();
        List<Management_Member__c> mgrRelationships = new  List<Management_Member__c>();
        List<Share_Ownership__c> shRelationships = new List<Share_Ownership__c>();
        List<UBO__c> uboRelationships = new List<UBO__c>();
        List<ContentDocumentLink> contentDocumentLinkList = new List<ContentDocumentLink>();
        Map<String,String> inActiveAccMap = new Map<String,String>();
        Onboard_Request__c onbAmend = new Onboard_Request__c();
        Set<String> relationshipIds = new Set<String>();
        Map<String,decimal> shrinfoMap = new Map<String,decimal>();
        Map<String,Decimal> uboinfoMap = new Map<String,Decimal>();
        String accountId;
        if(reqId!=null){
            onbAmend= [Select Id,Account_Name__c from Onboard_Request__c where Id=:reqId];
            accountId=onbAmend.Account_Name__c;
            List<Directorship__c> exisDirRelationshipsList =[SELECT Id, Director_Status__c,Directorship_End_Date__c,Company__c,Director__r.Onboarding_Role__c,Director__c,Roles__c,Director__r.Email__c,Director__r.Passport_No__c FROM Directorship__c Where Company__c=:accountId And Director_Status__c <> 'Active' ];
            for(Directorship__c rel : exisDirRelationshipsList){
              inActiveAccMap.put(rel.Director__r.Passport_No__c+''+rel.Director__r.Email__c,rel.Director__c);
            }
            List<Management_Member__c> exisMgrRelationshipsList =[SELECT Id, Manager_Status__c,Manager_End_Date__c,Company__c,Manager__r.Onboarding_Role__c,Manager__c,Role__c,Manager__r.Email__c,Manager__r.Passport_No__c FROM Management_Member__c Where Company__c=:accountId And Manager_Status__c <> 'Active' ];
            for(Management_Member__c rel : exisMgrRelationshipsList){
              inActiveAccMap.put(rel.Manager__r.Passport_No__c+''+rel.Manager__r.Email__c,rel.Manager__c);
            }
            List<Share_Ownership__c> exisShRelationshipsList =[SELECT Id, Shareholder_Status__c,Ownership_End_Date__c,Company__c,Shareholder__r.Onboarding_Role__c,Shareholder__c,Shareholder__r.Email__c,Shareholder__r.Passport_No__c FROM Share_Ownership__c Where Company__c=:accountId And Shareholder_Status__c <> 'Active' ];
            for(Share_Ownership__c rel : exisShRelationshipsList){
              inActiveAccMap.put(rel.Shareholder__r.Passport_No__c+''+rel.Shareholder__r.Email__c,rel.Shareholder__c);
            }
            List<UBO__c> exisUBORelationshipsList =[SELECT Id, Status__c,UBO_End_Date__c,Company__c,UBO__r.Onboarding_Role__c,UBO__c,UBO__r.Email__c,UBO__r.Passport_No__c FROM UBO__c Where Company__c=:accountId And Status__c <> 'Active' ];
            for(UBO__c rel : exisUBORelationshipsList){
              inActiveAccMap.put(rel.UBO__r.Passport_No__c+''+rel.UBO__r.Email__c,rel.UBO__c);
            }
        }
        
        for(OB_Amendment__c oba: obAmendments){
            Account pa = assignPersonAccount(oba);
            if(String.isBlank(oba.Relationship_Account__c) && String.isBlank(oba.RelationShipId__c)){
                //pa.RecordTypeId = personAccountRecordTypeId;
                pa.Onboarding_Role__c = oba.Role__c;
                if(inActiveAccMap != null && inActiveAccMap.containsKey(oba.Passport_Number__c+''+oba.EmailAddress__c)){
                  pa.id = inActiveAccMap.get(oba.Passport_Number__c+''+oba.EmailAddress__c);
                  updatePersonAccs.add(pa);
                   if(oba.Role__c == 'Manager'){
                    Management_Member__c rel = new Management_Member__c();
                    rel.Company__c = accountId;
                    rel.Manager_Status__c ='Active';
                    rel.Role__c = 'General Manager';
                    rel.Manager__c = pa.id;
                    rel.Manager_Start_Date__c=Date.today();
                    mgrRelationships.add(rel);
                   }
                   else if(oba.Role__c == 'Shareholder'){
                    Share_Ownership__c rel = new Share_Ownership__c();
                    rel.Company__c = accountId;
                    rel.Shareholder_Status__c ='Active';
                    rel.Shareholder__c = pa.id;
                    rel.No_of_Shares__c = oba.No_of_shares__c;
                    rel.Ownership_Start_Date__c=Date.today();
                    shRelationships.add(rel);
                   }
                   else if(oba.Role__c == 'UBO'){
                    UBO__c rel = new UBO__c();
                    rel.Company__c = accountId;                    
                    rel.UBO__c = pa.id;
                    rel.UBO_Start_Date__c=Date.today();
                    rel.Status_of_BO_Ownership__c = oba.Status_of_BO_Ownership__c;   
                    uboRelationships.add(rel);
                   }else{
                    Directorship__c rel = new Directorship__c();
                    rel.Company__c = accountId;
                    rel.Director_Status__c ='Active';
                    rel.Roles__c = oba.Role__c;
                    rel.Director__c = pa.id;
                    rel.Directorship_Start_Date__c=Date.today();
                    dirRelationships.add(rel);
                   }
                }
                else{
                 if(oba.Role__c == 'Shareholder'){
                     if(String.isNotBlank(oba.Owner_Type__c) && oba.Owner_Type__c == 'Individual')
                       shrinfoMap.put(oba.Passport_Number__c,oba.No_of_shares__c);
                     else
                       shrinfoMap.put(oba.Registration_Number__c,oba.No_of_shares__c);  
                 } 
                 if(oba.Role__c == 'UBO' && String.isNotBlank(oba.Owner_Type__c) && oba.Owner_Type__c == 'Individual'){
                    uboinfoMap.put(oba.Passport_Number__c,oba.Status_of_BO_Ownership__c);
                 }    
                 personAccs.add(pa);
                }
            }
            else if(oba.RelationShipId__c != null){
                 relationshipIds.add(oba.RelationShipId__c);
            }

        }
        if(!personAccs.isEmpty()){
            insert personAccs;
            for(Account a : personAccs){
                for(string r:a.Onboarding_Role__c.split(';')){
                    if(r == 'Manager'){
                     Management_Member__c rel = new Management_Member__c();
                     rel.Company__c = accountId;
                     rel.Manager_Status__c ='Active';
                     rel.Role__c = 'General Manager'; 
                     rel.Manager__c = a.Id;
                     rel.Manager_Start_Date__c=Date.today();
                     mgrRelationships.add(rel);
                    }
                    else if(r == 'Shareholder'){
                     Share_Ownership__c rel = new Share_Ownership__c();
                     rel.Company__c = accountId;
                     rel.Shareholder_Status__c ='Active';
                     rel.Shareholder__c = a.Id;
                     rel.Ownership_Start_Date__c=Date.today();
                     if(shrinfoMap != null && shrinfoMap.containskey(a.Passport_No__c))
                       rel.No_of_Shares__c = shrinfoMap.get(a.Passport_No__c);
                     else if(shrinfoMap != null && shrinfoMap.containskey(a.Registration_Number__pc)) 
                        rel.No_of_Shares__c = shrinfoMap.get(a.Registration_Number__pc); 
                     shRelationships.add(rel);
                    }
                    else if(r == 'UBO'){
                     UBO__c rel = new UBO__c();
                     rel.Company__c = accountId;
                     rel.UBO__c = a.Id;
                     rel.UBO_Start_Date__c=Date.today();
                     if(uboinfoMap != null && uboinfoMap.containskey(a.Passport_No__c))
                       rel.Status_of_BO_Ownership__c = uboinfoMap.get(a.Passport_No__c);                     
                     uboRelationships.add(rel);
                    }
                    else{
                     Directorship__c rel = new Directorship__c();
                     rel.Company__c = accountId;
                     rel.Director_Status__c ='Active';
                     rel.Roles__c = r; 
                     rel.Director__c = a.Id;
                     rel.Directorship_Start_Date__c=Date.today();
                     dirRelationships.add(rel);
                    }
                } 
                contentDocumentLinkList.add(new ContentDocumentLink(ContentDocumentId = a.Document_Id__c, ShareType='I', Visibility='AllUsers', LinkedEntityId = a.Id));
            }
            
        } 
        List<OB_Amendment__c> obAmendmentsExisting = [Select Id,POA_Name__c,Owner_Type__c,DACC_Registered__c,Relationship_Account__c,Title__c,RelationShipId__c,First_Name__c,Last_Name__c,Middle_Name__c,Passport_Number__c,Place_Of_Issue__c,Emirates_ID__c,
        Passport_Issued_Date__c,Gender__c,Last_Name_Arabic__c,First_Name_Arabic__c,Middle_Name_Arabic__c,Are_you_resident_in_the_UAE__c,
        Passport_Expiry_Date__c,Passport_Issuing_Country__c,Do_you_have_dual_Nationality__c,Secondary_Passport_Number__c,Secondary_Passport_Issue_Date__c,
        Secondary_Passport_Expiry_Date__c,Secondary_Place_Of_Issue__c,Secondary_Passport_Issuing_country__c,Are_you_a_Politically_Exposed_Person__c,Type_of_Politically_Exposed_Person__c,
        Secondary_Mobile_Number__c,Customer_Nationality__c,Country_of_Birth__c,Address2__c,City_Town__c,State__c,Po_Box_Postal_Code__c,Country__c,City_of_P_O_Box__c,
        Primary_Mobile_Number__c,Date_Of_Birth__c,Place_Of_Birth__c,Role__c,EmailAddress__c,Address1__c,Service_Type__c,Status__c,Registration_Number__c,Document_Id__c,Document_Link__c FROM OB_Amendment__c where Onboard_Request__c=: reqId and (RelationShipId__c !=null or Relationship_Account__c!=null)];
        List<Directorship__c> exDirRellist= new List<Directorship__c>();
        List<Management_Member__c> exMgrRellist= new List<Management_Member__c>();
        List<UBO__c> exUBORellist= new List<UBO__c>();
        Map<String, Directorship__c> existingDirRelationships = new Map<String, Directorship__c>([SELECT Id,Director_Status__c,Directorship_End_Date__c,Director__c,Director__r.Onboarding_Role__c FROM Directorship__c WHERE Id IN :relationshipIds]);
        Map<String, Management_Member__c> existingMgrRelationships = new Map<String, Management_Member__c>([SELECT Id,Manager_Status__c,Manager_End_Date__c,Manager__c,Manager__r.Onboarding_Role__c FROM Management_Member__c WHERE Id IN :relationshipIds]);
        Map<String, UBO__c> existingUBORelationships = new Map<String, UBO__c>([SELECT Id,UBO_End_Date__c,UBO__c,UBO__r.Onboarding_Role__c FROM UBO__c WHERE Id IN :relationshipIds]);
        for(OB_Amendment__c ob: obAmendmentsExisting){
            Account pa = new Account();
           if(String.isNotBlank(ob.Relationship_Account__c)){
                Account pacc = assignPersonAccount(ob);
                pacc.id = ob.Relationship_Account__c; 
                updatePersonAccs.add(pacc);
              
          }  
          else if(String.isNotBlank(ob.RelationShipId__c) && existingDirRelationships.containsKey(ob.RelationShipId__c)){
            Directorship__c existingRel = existingDirRelationships.get(ob.RelationShipId__c);
            pa.id = existingRel.Director__c; 
            String onbRole = existingRel.Director__r.Onboarding_Role__c;  
            Directorship__c relDir= new Directorship__c();
            if(ob.Status__c == 'Remove'){
                relDir =existingDirRelationships.get(ob.RelationShipId__c);
                relDir.Director_Status__c='Inactive';
                relDir.Directorship_End_Date__c=system.today();
                exDirRellist.add(relDir);
                if(String.isNotBlank(onbRole)){
                  pa.Onboarding_Role__c = onbRole.replace(ob.Role__c+';','').replace(ob.Role__c,'');
                  updatePersonAccs.add(pa);
                }                
            }
            else if(ob.Status__c == 'Existing'){                
                relDir.Company__c = accountId;
                relDir.Director_Status__c ='Active';
                relDir.Roles__c = ob.Role__c;
                relDir.Director__c = existingRel.Director__c;
                relDir.Directorship_Start_Date__c=Date.today();
                dirRelationships.add(relDir);
                if(String.isNotBlank(onbRole)){
                  pa.Onboarding_Role__c = onbRole + ';'+ob.Role__c;
                  updatePersonAccs.add(pa);
                }
            }
          }
          else if(String.isNotBlank(ob.RelationShipId__c) && existingMgrRelationships.containsKey(ob.RelationShipId__c)){
            Management_Member__c existingRel = existingMgrRelationships.get(ob.RelationShipId__c);
            pa.id = existingRel.Manager__c; 
            String onbRole = existingRel.Manager__r.Onboarding_Role__c; 
            Management_Member__c relMgr= new Management_Member__c(); 
            if(ob.Status__c == 'Remove'){
                relMgr =existingMgrRelationships.get(ob.RelationShipId__c);
                relMgr.Manager_Status__c='Inactive';
                relMgr.Manager_End_Date__c=system.today();
                exMgrRellist.add(relMgr);
                if(String.isNotBlank(onbRole)){
                  pa.Onboarding_Role__c = onbRole.replace(ob.Role__c+';','').replace(ob.Role__c,'');
                  updatePersonAccs.add(pa);
                }                
            }
            else if(ob.Status__c == 'Existing'){                
                relMgr.Company__c = accountId;
                relMgr.Manager_Status__c ='Active';
                relMgr.Role__c = ob.Role__c;
                relMgr.Manager__c = existingRel.Manager__c;
                relMgr.Manager_Start_Date__c=Date.today();
                mgrRelationships.add(relMgr);
                if(String.isNotBlank(onbRole)){
                  pa.Onboarding_Role__c = onbRole + ';'+ob.Role__c;
                  updatePersonAccs.add(pa);
                }
            }
          }
          else if(String.isNotBlank(ob.RelationShipId__c) && existingUBORelationships.containsKey(ob.RelationShipId__c)){
            UBO__c existingRel = existingUBORelationships.get(ob.RelationShipId__c);
            pa.id = existingRel.UBO__c; 
            String onbRole = existingRel.UBO__r.Onboarding_Role__c; 
            UBO__c relUBO= new UBO__c(); 
            if(ob.Status__c == 'Remove'){
                relUBO =existingUBORelationships.get(ob.RelationShipId__c);
                relUBO.UBO_End_Date__c=system.today();
                exUBORellist.add(relUBO);
                if(String.isNotBlank(onbRole)){
                  pa.Onboarding_Role__c = onbRole.replace(ob.Role__c+';','').replace(ob.Role__c,'');
                  updatePersonAccs.add(pa);
                }                
            }
            else if(ob.Status__c == 'Existing'){                
                relUBO.Company__c = accountId;
                relUBO.UBO__c = existingRel.UBO__c;
                relUBO.UBO_Start_Date__c=Date.today();
                uboRelationships.add(relUBO);
                if(String.isNotBlank(onbRole)){
                  pa.Onboarding_Role__c = onbRole + ';'+ob.Role__c;
                  updatePersonAccs.add(pa);
                }
            }
          }  
          
        }
        if(!dirRelationships.isEmpty()){
            insert dirRelationships;
        }
        if(!mgrRelationships.isEmpty()){
            insert mgrRelationships;
        }
        if(!uboRelationships.isEmpty()){
            insert uboRelationships;
        }
        if(!shRelationships.isEmpty()){
            insert shRelationships;
        }
        if(!exDirRellist.isEmpty()){
            update exDirRellist;
        }
        if(!exMgrRellist.isEmpty()){
            update exMgrRellist;
        }
        if(!exUBORellist.isEmpty()){
            update exUBORellist;
        }
        if(!updatePersonAccs.isEmpty() && !Test.isRunningTest()){
            update updatePersonAccs;
        }
        if(!contentDocumentLinkList.isEmpty() && !Test.isRunningTest()){
            insert contentDocumentLinkList;
        }
    }
    public static Account assignPersonAccount(OB_Amendment__c oba){
        Account accountToUpdate = new Account();
       
        if(String.isNotBlank(oba.Owner_Type__c) && (oba.Owner_Type__c == 'Corporate' || oba.Owner_Type__c == 'Exception Providing UBO Information')){
            if(String.isBlank(oba.DACC_Registered__c) || (String.isNotBlank(oba.DACC_Registered__c) && oba.DACC_Registered__c == 'No')){
                Id CompanyAccountRecordTypeId =  Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('DWC_Account').getRecordTypeId();
                 accountToUpdate = new Account(
                    name = oba.Company_Name__c,
                    Arabic_Account_Name__c = oba.Company_Name_Arabic__c,
                    Commercial_Registration_Number__c = oba.Registration_Number__c,
                    Company_Registration_Date__c = oba.Date_of_Incorporation__c,
                    Country_of_Origin__c = oba.Place_of_Registration__c,  
                    Company_Representative__c = oba.POA_Name__c,
                    Email__c = oba.EmailAddress__c,
                    Phone = oba.Primary_Mobile_Number__c,
                    Address__c = oba.Address1__c,
                    BillingStreet= oba.Address1__c+(String.isNotBlank(oba.Address2__c) ? (' '+oba.Address2__c):''), 
                    BillingCity=oba.City_Town__c,
                    BillingState=oba.State__c,
                    BillingPostalCode=oba.Po_Box_Postal_Code__c,
                    //Country_Address__c=oba.Country__c,
                    City_of_P_O_Box__c=oba.City_of_P_O_Box__c,
                    RecordTypeId = CompanyAccountRecordTypeId,
                    Document_Id__c = oba.Document_Id__c,
                    Document_Link__c = oba.Document_Link__c
                    );                    
            }     
        }
        else{
             Id personAccountRecordTypeId =  Schema.SObjectType.Account.getRecordTypeInfosByDeveloperName().get('PersonAccount').getRecordTypeId();
              accountToUpdate = new Account(
                Salutation=oba.Title__c,
                Gender__c=oba.Gender__c,
                FirstName = oba.First_Name__c,
                LastName = oba.Last_Name__c,
                Middle_Name__pc=oba.Middle_Name__c,
                Emirates_ID__c=oba.Emirates_ID__c,
                First_Name_Arabic__c =oba.First_Name_Arabic__c,
                Middle_Name_Arabic__c =oba.Middle_Name_Arabic__c,
                Resident_in_Dubai__pc=oba.Are_you_resident_in_the_UAE__c,
                Last_Name_Arabic__c =oba.Last_Name_Arabic__c,
                Passport_No__c = oba.Passport_Number__c,
                Passport_Place_of_Issue__c = oba.Place_Of_Issue__c,
                Passport_Issue_date__pc = oba.Passport_Issued_Date__c,
                Passport_Expiry_Date__pc=oba.Passport_Expiry_Date__c,
                //Passport_Issuing_Country__c=oba.Passport_Issuing_Country__c,
                Do_you_have_dual_Nationality__c=oba.Do_you_have_dual_Nationality__c,
                Secondary_Passport_Number__c=oba.Secondary_Passport_Number__c,
                Secondary_Passport_Issue_Date__c=oba.Secondary_Passport_Issue_Date__c,
                Secondary_Passport_Expiry_Date__c=oba.Secondary_Passport_Expiry_Date__c,
                Secondary_Place_Of_Issue__c=oba.Secondary_Place_Of_Issue__c,
                //Secondary_Passport_Issuing_country__c=oba.Secondary_Passport_Issuing_country__c,
                Are_you_a_Politically_Exposed_Person__c=oba.Are_you_a_Politically_Exposed_Person__c,
                Type_of_Politically_Exposed_Person__c=oba.Type_of_Politically_Exposed_Person__c,
                Phone_Number__c = oba.Primary_Mobile_Number__c,
                Secondary_Mobile_Number__c=oba.Secondary_Mobile_Number__c,
                Date_of_Birth__c = oba.Date_Of_Birth__c,
                Customer_Nationality__c=oba.Customer_Nationality__c,
                Place_of_Birth__c = oba.Place_Of_Birth__c,
                Country_of_Birth__c=oba.Country_of_Birth__c,
                Email__c = oba.EmailAddress__c,
                Address__c = oba.Address1__c,
                BillingStreet= oba.Address1__c+(String.isNotBlank(oba.Address2__c) ? (' '+oba.Address2__c):''), 
                BillingCity=oba.City_Town__c,
                BillingState=oba.State__c,
                BillingPostalCode=oba.Po_Box_Postal_Code__c,
                //Country_Address__c=oba.Country__c,
                City_of_P_O_Box__c=oba.City_of_P_O_Box__c,
                Owner_Type__pc = (String.isNotBlank(oba.Owner_Type__c) ? oba.Owner_Type__c : 'Individual'),
                RecordTypeId = personAccountRecordTypeId,
                Document_Id__c = oba.Document_Id__c,
                Document_Link__c = oba.Document_Link__c
            );
        }       
        return accountToUpdate; 
    }
    @AuraEnabled
    public static List<AmendmentReviewWrapper> getGeneralAmmendmentRecords (String requestId) {
        List<AmendmentReviewWrapper> onbAmmList = new List<AmendmentReviewWrapper>();
        OB_Amendment__c obmAmm;
        for(OB_Amendment__c Ob: [SELECT Id,Onboard_Request__r.Action_Template__r.acbox__Description__c,Full_Name__c,No_of_shares__c,Pledgee_Name__c,Pledgee_Start_Date__c,Pledgee_End_Date__c,No_of_Pledged_Shares__c,Name,Updating_Section__c,Role__c,Passport_Number__c,Status__c,Owner_Type__c,Registration_Number__c,Trade_License_Number__c,Document_Link__c,Address1__c,City_Town__c,Transfer_Shares_From__c,Shares_Transfer_Type__c,To_Shareholder__c,No_of_transfer_shares__c,(SELECT Id, Name FROM Attachments ORDER BY CreatedDate DESC LIMIT 1) FROM OB_Amendment__c WHERE Onboard_Request__c = :requestId])
        {
          if(String.isNotBlank(ob.Onboard_Request__r.Action_Template__r.acbox__Description__c)){
            AmendmentReviewWrapper ar = new AmendmentReviewWrapper();
            ar.recid = ob.id;
            ar.name = ob.Full_Name__c;
            ar.recLink = '/'+ob.id;
            ar.role = ob.Role__c;
            ar.passportNumber = (String.isNotBlank(ob.Owner_Type__c) && ob.Owner_Type__c == 'Individual') ? ob.Passport_Number__c : ob.Registration_Number__c;
            ar.status = ob.Status__c;
            ar.pledgeeName = ob.Pledgee_Name__c;
            Date strDt = ob.Pledgee_Start_Date__c;
            Date endDt = ob.Pledgee_End_Date__c;
            ar.pledgeeStartDate = (ob.Pledgee_Start_Date__c != null) ? (DateTime.newInstance(strDt.year(),strDt.month(),strDt.day()).format('MMM dd,YYYY')) : '' ; 
            ar.pledgeeEndDate = (ob.Pledgee_End_Date__c != null) ? (DateTime.newInstance(endDt.year(),endDt.month(),endDt.day()).format('MMM dd,YYYY')) : '' ;
            ar.noofPledgeShares = (ob.No_of_Pledged_Shares__c != null) ? integer.valueOf(ob.No_of_Pledged_Shares__c) : 0 ;
            ar.documentLink = ob.Document_Link__c;
            ar.updatingSection=ob.Updating_Section__c;
            ar.templateDescription =ob.Onboard_Request__r.Action_Template__r.acbox__Description__c;
            ar.noofShares = (ob.No_of_shares__c != null) ? integer.valueOf(ob.No_of_shares__c) : 0 ; 
            ar.noofTransferShares = (ob.No_of_transfer_shares__c != null) ? integer.valueOf(ob.No_of_transfer_shares__c) : 0 ;
            ar.shareTransferType = ob.Shares_Transfer_Type__c;
            ar.fromShareholder = ob.Transfer_Shares_From__c;
            ar.toShareholder = (String.isNotBlank(ob.Shares_Transfer_Type__c) && ob.Shares_Transfer_Type__c == 'New Shareholder') ? ob.Full_Name__c : ob.To_Shareholder__c;
            ar.shareholderType = ob.Owner_Type__c;
            ar.address = (String.isNotBlank(ob.Address1__c) && String.isNotBlank(ob.City_Town__c)) ?  (ob.Address1__c+','+ob.City_Town__c) : ob.Address1__c;
            ar.isUpdateMember = String.isNotBlank(ob.Updating_Section__c) ? true : false;
            onbAmmList.add(ar);
          }
        }
        return onbAmmList;
    }
    @AuraEnabled
    public static acbox__Action_Page_Flow__c getNextPageflowDetails(String previousPageFlow, String actionTemplateID){
        Boolean currentFlow = false;
        system.debug('previousPageFlow--->'+previousPageFlow);
        system.debug('actionTemplateID--->'+actionTemplateID);
        acbox__Action_Page_Flow__c ap = new acbox__Action_Page_Flow__c();
        for(acbox__Action_Page_Flow__c pg : [Select Id,Name,acbox__Community_Page_URL__c,acbox__Order__c FROM acbox__Action_Page_Flow__c Where acbox__Action_Template__c =:actionTemplateID AND acbox__Active__c = true ORDER BY acbox__Order__c ASC]){
            if(currentFlow){
                ap = pg;
                break;
            }
            if(pg.Name == previousPageFlow){
                currentFlow = true;
            }
        }
        system.debug('ap--->'+ap);
        return ap;
    }
    
    @AuraEnabled
    public static acbox__Action_Page_Flow__c getPreviousPageflowDetails(String previousPageFlow, String actionTemplateID){
        Boolean currentFlow = false;
        acbox__Action_Page_Flow__c ap = new acbox__Action_Page_Flow__c();
        for(acbox__Action_Page_Flow__c pg : [Select Id,Name,acbox__Community_Page_URL__c,acbox__Order__c FROM acbox__Action_Page_Flow__c Where acbox__Action_Template__c =:actionTemplateID AND acbox__Active__c = true ORDER BY acbox__Order__c Desc]){
            if(currentFlow){
                ap = pg;
                break;
            }
            if(pg.Name == previousPageFlow){
                currentFlow = true;
            }
        }
        return ap;
    }
    public static void processLicenseRenual(Sobject sObj,String subMenuTxt){
    Onboard_Request__c onbReq = (Onboard_Request__c) sObj;
    List<acbox__Request_Document__c> reqDocs = new List<acbox__Request_Document__c>();
    List<Share_Ownership__c> relList = new List<Share_Ownership__c>();
    List<Share_Ownership__c> relInsideUAEList = new List<Share_Ownership__c>();
    List<Share_Ownership__c> relOutsideUAEList = new List<Share_Ownership__c>();
    List<acbox__Action_Document__c> actDocsGoodStand=[select acbox__Description__c,acbox__Active__c,acbox__Default_Status__c,acbox__Is_Required__c,Id,acbox__Long_Description__c,Accepted_Extensions__c,Name  from acbox__Action_Document__c where acbox__Action_template__r.acbox__Unique_Code__c ='LicenseRenewal' and Name='Good Standing Document'];
    List<acbox__Action_Document__c> actDocsTradeLic=[select acbox__Description__c,acbox__Active__c,acbox__Default_Status__c,acbox__Is_Required__c,Id,acbox__Long_Description__c,Accepted_Extensions__c,Name  from acbox__Action_Document__c where acbox__Action_template__r.acbox__Unique_Code__c ='LicenseRenewal' and NAme='Active Trade License'];

        Set<String> existingRequestDocNames = new Set<String>();
        for (acbox__Request_Document__c existingReqDoc : [SELECT Name FROM acbox__Request_Document__c WHERE Onboard_Request__c = :onbReq.Id]) {
            existingRequestDocNames.add(existingReqDoc.Name);
        }
        List<Onboard_Request__c> obrlist = [SELECT id, Account_Name__c, Account_Name__r.Current_License_Number__c FROM Onboard_Request__c WHERE id = :onbReq.Id];
        if (obrlist != null && !obrlist.isEmpty()) {
            relList = [SELECT id,Company__r.BillingCountry,Shareholder__r.Name,Shareholder__c,Company__c,Shareholder__r.Owner_Type__pc FROM Share_Ownership__c WHERE Company__c = :obrlist[0].Account_Name__c AND Shareholder_Status__c='Active'];
        }
        if (relList != null && !relList.isEmpty()) {
            for (Share_Ownership__c rel : relList) {
                if (rel.Shareholder__r.Owner_Type__pc == 'Corporate' && String.isNotBlank(rel.Company__r.BillingCountry) && (rel.Company__r.BillingCountry =='UAE' || rel.Company__r.BillingCountry =='United Arab Emirates') ) {
                    relInsideUAEList.add(rel);
                }else if(rel.Shareholder__r.Owner_Type__pc == 'Corporate' && String.isNotBlank(rel.Company__r.BillingCountry) && (rel.Company__r.BillingCountry !='UAE' || rel.Company__r.BillingCountry !='United Arab Emirates')){
                    relOutsideUAEList.add(rel);
                }
            }
        }
        if (relInsideUAEList != null && !relInsideUAEList.isEmpty()) {
            for(Share_Ownership__c rel: relInsideUAEList){
                 String godStandDocName = rel.Shareholder__r.Name+ '-' + 'Good Standing Document';
                 if (!existingRequestDocNames.contains(godStandDocName)) {
                     acbox__Request_Document__c reqDoc1 = new acbox__Request_Document__c(
                         acbox__Active__c = actDocsGoodStand[0].acbox__Active__c,
                         acbox__Status__c = actDocsGoodStand[0].acbox__Default_Status__c,
                         Name = godStandDocName,
                         acbox__Record_Id__c = onbReq.Id,
                         Onboard_Request__c = onbReq.Id,
                         acbox__Action_Document__c =actDocsGoodStand[0].Id,
                         acbox__Description__c = actDocsGoodStand[0].acbox__Description__c
                     );
                     reqDocs.add(reqDoc1);
                 }
            }
        }
        if (relOutsideUAEList != null && !relOutsideUAEList.isEmpty()) {
            for(Share_Ownership__c rel: relOutsideUAEList){
                String tradLicName =  rel.Shareholder__r.Name + '-' + 'Active Trade License';
                if (!existingRequestDocNames.contains(tradLicName)) {
                     acbox__Request_Document__c reqDoc1 = new acbox__Request_Document__c(
                         acbox__Active__c = actDocsTradeLic[0].acbox__Active__c,
                         acbox__Status__c = actDocsTradeLic[0].acbox__Default_Status__c,
                         Name = tradLicName,
                         acbox__Record_Id__c = onbReq.Id,
                         Onboard_Request__c = onbReq.Id,
                         acbox__Action_Document__c =actDocsTradeLic[0].Id,
                         acbox__Description__c = actDocsTradeLic[0].acbox__Description__c
                     );
                     reqDocs.add(reqDoc1);
                 }
            }  
        }
        if (reqDocs != null && !reqDocs.isEmpty()) {
             insert reqDocs;
         }
    }
    
    //Added by Vinod for Company Registration
    @AuraEnabled 
    public static string getRegistrationActivities(string accountId){
        List<RegistrationActivityWrapper> RegistrationActivityList = new List<RegistrationActivityWrapper>();
        for(Registration_Activities__c objRegActivity : [SELECT Id,Name,Main_Activity__c,Registration_Activity_Name__c,Original_Business_Activity__c,Original_Business_Activity__r.License_Type__c,Original_Business_Activity__r.Business_Activity_Name__c,Original_Business_Activity__r.Business_Activity_Name_Arabic__c FROM Registration_Activities__c WHERE Account__c=:accountId]){
            RegistrationActivityWrapper objWrapper = new RegistrationActivityWrapper();
            objWrapper.MainActivity = objRegActivity.Main_Activity__c;
            objWrapper.Name = objRegActivity.Name;
            objWrapper.BusinessActivity = objRegActivity.Original_Business_Activity__r.Business_Activity_Name__c;
            objWrapper.BusinessActivityArabicName = objRegActivity.Original_Business_Activity__r.Business_Activity_Name_Arabic__c;
            objWrapper.Category = objRegActivity.Registration_Activity_Name__c;
            objWrapper.LicenseType = objRegActivity.Original_Business_Activity__r.License_Type__c;
            RegistrationActivityList.add(objWrapper);
        }
        return JSON.serialize(RegistrationActivityList);
    }
   
   //commented by manoj
    //Added by Vinod 25 June 2024 - Start
    /* public static void createInvoice(string requestId){
        String MainServiceRef; String InvoiceCategory; String InvoiceSubCategory; String CompanyType;
        String CustomerRef; String noqodiStatus; String DDPFileId; String DeliveryMethodId; 
        String EmailDeliveryMethodId; String InvoicePrefix;
        Double tempRequestFee = 0; 
        
        String Query = 'select id, Name, Request_Type__c,Establishment_Card__c,Customer_Transactions__c,License__c, Action_Template__r.EserviceReference__c,Action_Template__r.Menu_Group__c,Action_Template__r.Name,Action_Template__r.Department__c,Action_Template__r.Menu_Text__c,Status__c,Account_Name__c,Account_Name__r.Name,Account_Name__r.Portal_Balance__c,Noqodi_Transaction_Status__c,';
        Query += '(Select id, Quantity__c,acbox__Price__c,Vat_Cal__c, acbox__Action_Price__r.eService_Administration__c,acbox__Action_Price__r.eService_Administration__r.ERP_Category__c,acbox__Action_Price__r.eService_Administration__r.Company_Type__c,acbox__Action_Price__r.eService_Administration__r.Sub_Category__c,Is_Main_Service__c,acbox__Action_Price__r.eService_Administration__r.Invoice_DDP_File_Id__c,acbox__Action_Price__r.eService_Administration__r.Invoice_Delivery_Method_Id__c,acbox__Action_Price__r.eService_Administration__r.Invoice_Email_Delivery_Method_Id__c,acbox__Action_Price__r.eService_Administration__r.Invoice_Prefix__c from Request_Products__r where acbox__Status__c='+ds_SOQLLibrary.escapeString('Added')+')';
        Query += ' FROM Onboard_Request__c Where Id =: requestId LIMIT 1';
        //Onboard_Request__c obrReq= [Select Id,Account_Name__c,Account_Name__r.Current_License_Number__c from Onboard_Request__c where Id=:requestId];   
        List<SObject> serviceReq = Database.query(Query);
        List<Onboard_Request__c> serviceRequestList = (List<Onboard_Request__c>) serviceReq;
        List<Invoice__c> invoiceList = [Select Id,Name,Amount__c FROM Invoice__c WHERE Onboard_Request__c=:serviceReq];
        if(invoiceList.isEmpty()){
            CustomerRef = (String) serviceReq[0].get('Account_Name__c');
            noqodiStatus = (String) serviceReq[0].get('Noqodi_Transaction_Status__c');
            
            List<Invoice_Line_Item__c> LineItems = new List<Invoice_Line_Item__c>(); 
            List<Sobject> LstOfActionPrices  = serviceReq[0].getSobjects('Request_Products__r');
            
            for (Sobject ObjPrice : LstOfActionPrices) {
                tempRequestFee +=  (Decimal) ObjPrice.get('acbox__Price__c');        
                
                if((boolean) ObjPrice.get('Is_Main_Service__c')) {
                    MainServiceRef     = (String) ObjPrice.getSObject('acbox__Action_Price__r').get('eService_Administration__c');
                    InvoiceCategory    = (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('ERP_Category__c');
                    InvoiceSubCategory = (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Sub_Category__c');
                    CompanyType        = (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Company_Type__c');
                    DDPFileId        = (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Invoice_DDP_File_Id__c');
                    DeliveryMethodId        = (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Invoice_Delivery_Method_Id__c');
                    EmailDeliveryMethodId        = (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Invoice_Email_Delivery_Method_Id__c');
                    InvoicePrefix =  (String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Invoice_Prefix__c');   
                }
                Decimal quantity = (Decimal) ObjPrice.get('Quantity__c');
                LineItems.add(new Invoice_Line_Item__c(Amount__c = quantity * (Decimal) ObjPrice.get('acbox__Price__c'),
                                                       Service__c = (ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r') != null ? ((String) ObjPrice.getSObject('acbox__Action_Price__r').getSObject('eService_Administration__r').get('Id')) :null), 
                                                       Quantity__c = quantity
                                                       //quantity__c = 1
                                                       //,Unit_Description__c= (String) ObjPrice.get('License_Penalty_Description__c')
                                                       ));
                // ObjPrice.put('acbox__Status__c', 'Invoiced');
            }
            
            //Step 1: Create Invoice 
            Invoice__c INV = new Invoice__c();   
            INV.eService_Admin__c = MainServiceRef;
            INV.Category__c = InvoiceCategory ;
            INV.Sub_Category__c = InvoiceSubCategory;
            INV.Status__c = 'Posted';
            INV.Paid_Amount__c = 0;
            //INV.Description__c = 'Payment for '+serviceRequestList[0].Action_Template__r.Menu_Text__c+', Reference Number: '+serviceRequestList[0].Name;
            //INV.Paid_Amount__c = tempRequestFee;
            INV.Posted__c = true;
            INV.Posted_Date_Time__c = System.Now();
            INV.Due_Date__c = Datetime.now();
            INV.Description__c = 'Payment for Initial Application Fee, Reference Number: '+serviceRequestList[0].Name;
            INV.Related_To__c = 'Registration';
            INV.Received_From__c = CustomerRef;
            INV.Onboard_Request__c = requestId;
            INV.Custom_Index__c = 0;
            INV.Company_Type__c = CompanyType;
            INV.DDP_File_Id__c = DDPFileId;
            INV.Delivery_Method_Id__c = DeliveryMethodId;
            INV.Email_Delivery_Method_Id__c = EmailDeliveryMethodId;  
            INV.Invoice_Prefix__c = InvoicePrefix;
            //INV.Related_to_License__c =obrReq.Account_Name__r.Current_License_Number__c;
            //INV.Establishment_Card__c=(ID)serviceReq[0].get('Establishment_Card__c');
            INSERT INV;
            for(Invoice_Line_Item__c LineItem : LineItems) {   
                LineItem.Invoice__c = INV.id;
            }
            INSERT LineItems;
            //Send invoice to customer
           // sendInvoiceToCustomer(INV.Id);
            Onboard_Request__c obRequest = new Onboard_Request__c(Id=requestId, Invoice__c=INV.Id);
            update obRequest;            
        }
    } */
    
/*    @future(callout=true) //commented by shubham for test class- because its commented at line 1812
    public static void sendInvoiceToCustomer(String invoiceId){
        /* if(invoiceId != null){
            list<Invoice__c> invLst = [SELECT Id, DDP_Send_Email_URL__c FROM Invoice__c WHERE ID=:invoiceId AND DDP_Send_Email_URL__c != null];
            if(!invLst.isEmpty()){
                string ddpStr = invLst[0].DDP_Send_Email_URL__c;
                if(ddpStr.contains('ddpIds') && (ddpStr.contains('deploy'))){
                    string ddpIds = ddpStr.substringBefore('&').substringAfter('=');
                    string deploy = ddpStr.substringAfter('&').substringAfter('=');
                    Loop.loopMessage lm = new Loop.loopMessage();
                    lm.requests.add(new Loop.loopMessage.loopMessageRequest(invoiceId,ddpIds, new Map<string, string> { 'deploy' => deploy} ));
                    lm.sendAllRequests();
                }
            }
        } /
        if(invoiceId!=null){
            Loop__DDP_Integration_Option__c option = new Loop__DDP_Integration_Option__c(); 
            option = [SELECT ID,Loop__DDP__c FROM Loop__DDP_Integration_Option__c where Loop__DDP__r.Name ='DACC Invoice Print' AND Name ='Invoice Attachment'];
            Loop.loopMessage lm = new Loop.loopMessage();
            lm.requests.add(new Loop.loopMessage.loopMessageRequest(invoiceId,option.Loop__DDP__c, new Map<string, string> { 'deploy' => option.Id} ));
            lm.sendAllRequests();
        }
    } 
*/
   /* @AuraEnabled(cacheable=false)
    public static AddBoardMemberWrapper getAddBoardMembersData(string requestId) { 
       AddBoardMemberWrapper objWrapper = new AddBoardMemberWrapper();   
       Map<String, String> mapEntityTypeandShraeholderMaximumAllowedCount = new Map<String, String>(); 
        Map<String, String> mapEntityTypeandDirectorMaximumAllowedCount = new Map<String, String>(); 
       Onboard_Request__c objRequest = [Select Id,Account_Name__r.Entity_Type__c FROM Onboard_Request__c WHERE Id=:requestId];
       for(Add_Board_Member_Config__mdt objData : [Select Entity_Type__c, Role__c, Maximum_Allowed__c FROM Add_Board_Member_Config__mdt]){
           if(objData.Role__c == 'Shareholder'){
               mapEntityTypeandShraeholderMaximumAllowedCount.put(objData.Entity_Type__c, objData.Maximum_Allowed__c);
           } 
           if(objData.Role__c == 'Director'){
               mapEntityTypeandDirectorMaximumAllowedCount.put(objData.Entity_Type__c, objData.Maximum_Allowed__c);
           }
           
       }
       objWrapper.EntityType = objRequest.Account_Name__r.Entity_Type__c;
       objWrapper.maxAllowedShareholders = mapEntityTypeandShraeholderMaximumAllowedCount.get(objRequest.Account_Name__r.Entity_Type__c);
       objWrapper.maxAllowedDirectors = mapEntityTypeandDirectorMaximumAllowedCount.get(objRequest.Account_Name__r.Entity_Type__c);
       return objWrapper;
    }
    */
    @AuraEnabled
    public static String createReqDocuments(String reqId,String reqType){     
      String res = 'Success';  
       processDocuments(reqId,reqType);
      return res;  
    }

    public static void processDocuments(String srId, String uniqueueCode) {
        Onboard_Request__c obr = new Onboard_Request__c();
        List<acbox__Request_Document__c> reqList = new List<acbox__Request_Document__c>();
        obr =[SELECT Id,Parent_Company__c,Parent_Company__r.Name,Action_Template__c,Action_Template_Unique_Code__c,Account_Name__c,Account_Name__r.Name,Share_Capital__c,Legal_Type__c,Business_Entity__c,Parent_Company_Name__c,Company_Exist_In_Dubai_South__c FROM Onboard_Request__c where Id=:srId];
        if(uniqueueCode =='CompanyRegistration'){ 
            List<acbox__Request_Document__c> reqDocsToInsert = new List<acbox__Request_Document__c>();
            List<acbox__Request_Document__c> reqDocsToDelete = new List<acbox__Request_Document__c>();
            Set<String> existRqDocNameList  = new Set<String>(); 
            Set<String> shOwnerNameList = new Set<String>();
            Set<String> exstShrNameList = new Set<String>();
            Set<String> exstShrCmpNameList = new Set<String>();
            Set<String> exstShrDOBList = new Set<String>();
            Set<String> exstShrCorporateList = new Set<String>();
            Set<String> exstShrCorporate = new Set<String>();
            Set<String> exstShrCorporate1 = new Set<String>();
            //V2.1
            Set<String> secondPassportShrList = new Set<String>();
            Set<String> shareCapitalList = new Set<String>();
            //String specialCharRegex = '[^a-zA-Z0-9]$';
            String specialCharRegex = '[ ]$';

            List<OB_Amendment__c> obAmendmentList = [Select id,Is_UBO__c,UBO_Individual_Name__c,DACC_Registered__c,Place_of_Registration__c,Place_of_Registration__r.Name,Full_Name__c,Role__c,Owner_Type__c,Date_Of_Birth__c,Do_you_have_dual_Nationality__c FROM OB_Amendment__c where Onboard_Request__c=:obr.Id and Status__c='New'];
            exstShrCmpNameList.add(obr.Account_Name__r.Name);
            for(OB_Amendment__c obA : obAmendmentList){
                if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Individual' && obA.Date_Of_Birth__c != null){
                    Date dt = obA.Date_Of_Birth__c;
                    Integer days = dt.daysBetween(Date.Today());
                    Integer age = Integer.valueOf(days/365);
                    if(age <= 18){
                        exstShrDOBList.add(obA.Full_Name__c);   
                    }
                }
                if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate'){
                    exstShrCorporate.add(obA.Full_Name__c);
                }
                if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate' && obA.DACC_Registered__c=='No' && obA.Place_of_Registration__r.Name == 'UNITED ARAB EMIRATES'){
                    exstShrCorporateList.add(obA.Full_Name__c);
                }
                if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate' && obA.Is_UBO__c == false){
                    exstShrCorporate1.add(obA.UBO_Individual_Name__c);
                }
                //V2.1
                if(String.isNotBlank(obA.Do_you_have_dual_Nationality__c) && obA.Do_you_have_dual_Nationality__c == 'No'){
                    secondPassportShrList.add(obA.Full_Name__c);  
                }                
            }
            if(obr.Share_Capital__c< 1000000){
                shareCapitalList.add('ShareCapital');
            }
            Map<string,List<acbox__Action_Document__c>> acDocMap = new Map<string,List<acbox__Action_Document__c>>();
            for(acbox__Action_Document__c acDoc : [SELECT Id,Name,acbox__Description__c,acbox__Default_Status__c, Delivery_Option__c, acbox__Long_Description__c, Accepted_Extensions__c,acbox__Type__c,acbox__Unique_Key__c FROM acbox__Action_Document__c where acbox__Action_template__c=:obr.Action_Template__c and acbox__Stage__c='Code' and acbox__Active__c=true]){
                if(String.isNotBlank(acDoc.acbox__Type__c) && acDocMap != null && acDocMap.containskey(acDoc.acbox__Type__c)){
                    List<acbox__Action_Document__c> acDocList = acDocMap.get(acDoc.acbox__Type__c);
                    acDocList.add(acDoc);
                    acDocMap.put(acDoc.acbox__Type__c,acDocList);
                }
                else{
                    List<acbox__Action_Document__c> acDocList = new  List<acbox__Action_Document__c>();
                    acDocList.add(acDoc); 
                    acDocMap.put(acDoc.acbox__Type__c,acDocList);
                }     
            }
            List<acbox__Request_Document__c> reqDocsExist = [select id,Name,Certificate_Letter_Authority__c,acbox__Action_Document__r.acbox__Type__c from acbox__Request_Document__c where Onboard_Request__c=:obr.Id and acbox__Action_Document__r.acbox__Stage__c ='Code'];
            if(reqDocsExist != null && !reqDocsExist.isEmpty()){
                for(acbox__Request_Document__c reqDoc : reqDocsExist){
                    String shOwnerName = reqDoc.Certificate_Letter_Authority__c;
                    String exstRqDocName = reqDoc.Name;
                    exstRqDocName = ((exstRqDocName.length() <=80) ? exstRqDocName : (exstRqDocName.substring(0,80)));
                    existRqDocNameList.add(exstRqDocName);
                    if(reqDoc.acbox__Action_Document__r.acbox__Type__c == 'ShareResolutionBranch' && exstShrCmpNameList != null && !exstShrCmpNameList.contains(shOwnerName)){
                        reqDocsToDelete.add(reqDoc);
                    }
                    /*Commented by Vinod
                    if(reqDoc.acbox__Action_Document__r.acbox__Type__c == 'ShareResolutionCompany' && exstShrCmpNameList != null && !exstShrCmpNameList.contains(shOwnerName)){
                        reqDocsToDelete.add(reqDoc);
                    }*/
                    if(reqDoc.acbox__Action_Document__r.acbox__Type__c == 'GuardianNOC' && (exstShrDOBList == null || !exstShrDOBList.contains(shOwnerName))){
                        reqDocsToDelete.add(reqDoc);
                    }
					/*if(reqDoc.Name.startswith('Certificate of Good Standing') && reqDoc.acbox__Action_Document__r.acbox__Type__c == 'Corporate' && exstShrCorporateList.contains(shOwnerName)){
                        reqDocsToDelete.add(reqDoc);
                    }*/
                    if(reqDoc.acbox__Action_Document__r.acbox__Type__c == 'SecondaryPassport' && secondPassportShrList.contains(shOwnerName)){
                        reqDocsToDelete.add(reqDoc);
                    }
                    if(reqDoc.acbox__Action_Document__r.acbox__Type__c == 'ShareCapital' && shareCapitalList.contains(reqDoc.acbox__Action_Document__r.acbox__Type__c)){
                        reqDocsToDelete.add(reqDoc);
                    }
                    if(reqDoc.acbox__Action_Document__r.acbox__Type__c == 'PassportBO' && exstShrCorporate1.contains(shOwnerName)){
                        reqDocsToDelete.add(reqDoc);
                    }
                }
            }
            for(String shName : exstShrDOBList){
                //List<acbox__Action_Document__c> acExtDocList = acDocMap.get('GuardianNOC'); 
                List<acbox__Action_Document__c> acExtDocList = acDocMap.containsKey('GuardianNOC') ? acDocMap.get('GuardianNOC') : new  List<acbox__Action_Document__c> ();

                acbox__Action_Document__c acDoc = acExtDocList[0]; 
                String rqDocname = acDoc.Name+' - '+shName;
                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                    // Remove the last character
                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                }
                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                    reqDoc.Name = rqDocname;
                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                    reqDoc.acbox__Record_Id__c = srId;
                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                    reqDoc.acbox__Active__c = true;
                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                    reqDoc.Onboard_Request__c = obr.Id;
                    reqDoc.Certificate_Letter_Authority__c = shName;
                    reqDocsToInsert.add(reqDoc);
                    existRqDocNameList.add(rqDocname);
                } 
            } 
            for(String shrCmpName : exstShrCmpNameList){ 
                //if(obr.Legal_Type__c == 'DWC-LLC'){ Commented by Vinod because template is merged
               /* if(obr.Business_Entity__c == 'DWC-LLC' && !exstShrCorporate.isEmpty()){ 
                    List<acbox__Action_Document__c> srDocList = acDocMap.get('ShareResolutionCompany'); 
                    acbox__Action_Document__c srACDoc = srDocList[0]; 
                    String rqSRDocname = srACDoc.Name+' - '+shrCmpName;
                    rqSRDocname = ((rqSRDocname.length() <=80) ? rqSRDocname : (rqSRDocname.substring(0,80)));
                    if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqSRDocname)){
                        acbox__Request_Document__c srReqDoc = new acbox__Request_Document__c();
                        srReqDoc.Name = rqSRDocname;
                        srReqDoc.acbox__Action_Document__c = srACDoc.Id;
                        srReqDoc.acbox__Record_Id__c = srId;
                        srReqDoc.acbox__Description__c = srACDoc.acbox__Description__c;
                        srReqDoc.acbox__Active__c = true;
                        srReqDoc.acbox__Status__c=srACDoc.acbox__Default_Status__c;
                        srReqDoc.Onboard_Request__c = obr.Id;
                        srReqDoc.Certificate_Letter_Authority__c = shrCmpName;
                        reqDocsToInsert.add(srReqDoc);
                        existRqDocNameList.add(rqSRDocname);
                    }
                } */
            } 
            //Added by Vinod for branch
            for(String shrCmpName : exstShrCmpNameList){
                //if(obr.Legal_Type__c == 'DWC-Branch'){
                if(obr.Business_Entity__c == 'DWC-Branch'){
                   // List<acbox__Action_Document__c> srDocList = acDocMap.get('ShareResolutionBranch'); 
                    List<acbox__Action_Document__c> srDocList = acDocMap.containsKey('ShareResolutionBranch') ? acDocMap.get('ShareResolutionBranch') : new  List<acbox__Action_Document__c> ();

                    acbox__Action_Document__c srACDoc = !srDocList.isEmpty() ? srDocList[0] : new acbox__Action_Document__c(); 
                    String rqDocname='';
                    if(obr.Company_Exist_In_Dubai_South__c == 'No'){
                        rqDocname = srACDoc?.Name+' - '+obr.Parent_Company_Name__c;
                    }else{
                        rqDocname = srACDoc?.Name+' - '+obr.Parent_Company__r.Name;
                    }
                    
                    rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                    if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                        // Remove the last character
                        rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                    }
                    if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                        acbox__Request_Document__c srReqDoc = new acbox__Request_Document__c();
                        srReqDoc.Name = rqDocname;
                        srReqDoc.acbox__Action_Document__c = srACDoc.Id;
                        srReqDoc.acbox__Record_Id__c = srId;
                        srReqDoc.acbox__Description__c = srACDoc.acbox__Description__c;
                        srReqDoc.acbox__Active__c = true;
                        srReqDoc.acbox__Status__c=srACDoc.acbox__Default_Status__c;
                        srReqDoc.Onboard_Request__c = obr.Id;
                        srReqDoc.Certificate_Letter_Authority__c = shrCmpName;
                        reqDocsToInsert.add(srReqDoc);
                        existRqDocNameList.add(rqDocname);
                    }
                }
            }
            ////Added by Vinod for branch
            for(String shName : exstShrCmpNameList){
                //if(obr.Legal_Type__c == 'DWC-Branch'){
                if(obr.Business_Entity__c == 'DWC-Branch'){
                    //List<acbox__Action_Document__c> acExtDocList = acDocMap.get('DWC-Branch');
                     List<acbox__Action_Document__c> acExtDocList = acDocMap.containsKey('DWC-Branch') ? acDocMap.get('DWC-Branch') : new  List<acbox__Action_Document__c> ();

                    for(acbox__Action_Document__c acDoc : acExtDocList){
                        //String rqDocname = acDoc.Name+' - '+shName;
                        String rqDocname = acDoc.Name;
                        rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                        if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                            // Remove the last character
                            rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                        }
                        if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                            acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                            reqDoc.Name = rqDocname;
                            reqDoc.acbox__Action_Document__c = acDoc.Id;
                            reqDoc.acbox__Record_Id__c = srId;
                            reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                            reqDoc.acbox__Active__c = true;
                            reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                            reqDoc.Onboard_Request__c = obr.Id;
                            reqDoc.Certificate_Letter_Authority__c = shName;
                            reqDocsToInsert.add(reqDoc);
                            existRqDocNameList.add(rqDocname);
                        } 
                    }
                }
            } 
            for(OB_Amendment__c obA : obAmendmentList){
                if(String.isNotBlank(obA.Owner_Type__c) && acDocMap.containsKey(obA.Owner_Type__c)){
                    List<acbox__Action_Document__c> acDocList = new  List<acbox__Action_Document__c> ();
                    acDocList = acDocMap.containsKey(obA.Owner_Type__c) ? acDocMap.get(obA.Owner_Type__c) : new  List<acbox__Action_Document__c> ();
                    for(acbox__Action_Document__c acDoc : acDocList){
                        system.debug('acDoc--->'+acDoc);
                        system.debug('obA--->'+obA);
                        if((obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate') || (obA.Role__c.Contains('UBO') && obA.Owner_Type__c == 'Government / Listed on Stock Exchange')){
                            if((obA.DACC_Registered__c=='No' && acDoc.Name.startswith('Incumbency ')) || (obA.DACC_Registered__c=='Yes' && !acDoc.Name.startswith('Incumbency ') /*&& !acDoc.Name.startswith('Certificate of Good Standing')*/) /*|| (obA.DACC_Registered__c=='No' && acDoc.Name.startswith('Certificate of Good Standing') && obA.Place_of_Registration__c !=null && obA.Place_of_Registration__r.Name != 'UNITED ARAB EMIRATES')*/){
                                String rqDocname = acDoc.Name+' - '+obA.Full_Name__c;
                                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                                    // Remove the last character
                                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                                }
                                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                                    reqDoc.Name = rqDocname;
                                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                                    reqDoc.acbox__Record_Id__c = srId;
                                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                                    reqDoc.acbox__Active__c = true;
                                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                                    reqDoc.Onboard_Request__c = obr.Id;
                                    reqDoc.OB_Amendment__c = obA.id;
                                    reqDoc.Certificate_Letter_Authority__c = obA.Full_Name__c;
                                    reqDocsToInsert.add(reqDoc);
                                    existRqDocNameList.add(rqDocname);
                                }
                            }
                           // }
                        }
                    }
                    
                    //Added by shubham to add POA Documents for Corporate shareholder  
                   // acDocList = acDocMap.get('POA Signatory');
                    acDocList = acDocMap.containsKey('POA Signatory') ? acDocMap.get('POA Signatory') : new  List<acbox__Action_Document__c> ();
                    for(acbox__Action_Document__c acDoc : acDocList){
                        if((obA.Role__c.Contains('Shareholder') /*|| obA.Role__c.Contains('UBO')*/) && obA.Owner_Type__c == 'Corporate'){
                                String rqDocname = acDoc.Name+' - '+obA.Full_Name__c;
                                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                                    // Remove the last character
                                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                                }
                                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                                    reqDoc.Name = rqDocname;
                                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                                    reqDoc.acbox__Record_Id__c = srId;
                                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                                    reqDoc.acbox__Active__c = true;
                                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                                    reqDoc.Onboard_Request__c = obr.Id;
                                    reqDoc.OB_Amendment__c = obA.id;
                                    reqDoc.Certificate_Letter_Authority__c = obA.Full_Name__c;
                                    reqDocsToInsert.add(reqDoc);
                                    existRqDocNameList.add(rqDocname);
                                }
                        }
                    } 

                    //Added by Vinod for POA Passport Copy
                    //acDocList = acDocMap.get('Passport');
                    acDocList = acDocMap.containsKey('Passport') ? acDocMap.get('Passport') : new  List<acbox__Action_Document__c> ();
                    for(acbox__Action_Document__c acDoc : acDocList){
                        if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate'){
                                String rqDocname = acDoc.Name+' - '+obA.Full_Name__c;
                                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                                    // Remove the last character
                                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                                }
                                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                                    reqDoc.Name = rqDocname;
                                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                                    reqDoc.acbox__Record_Id__c = srId;
                                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                                    reqDoc.acbox__Active__c = true;
                                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                                    reqDoc.Onboard_Request__c = obr.Id;
                                    reqDoc.OB_Amendment__c = obA.id;
                                    reqDoc.Certificate_Letter_Authority__c = obA.Full_Name__c;
                                    reqDocsToInsert.add(reqDoc);
                                    existRqDocNameList.add(rqDocname);
                                }
                        }
                    }

                    //Beneficial Owner Passport Copy
                    acDocList = acDocMap.containsKey('PassportBO') ? acDocMap.get('PassportBO') : new  List<acbox__Action_Document__c> ();
                    for(acbox__Action_Document__c acDoc : acDocList){
                        if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate' && obA.Is_UBO__c == true){
                                String rqDocname = acDoc.Name+' - '+obA.UBO_Individual_Name__c;
                                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                                    // Remove the last character
                                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                                }
                                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                                    reqDoc.Name = rqDocname;
                                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                                    reqDoc.acbox__Record_Id__c = srId;
                                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                                    reqDoc.acbox__Active__c = true;
                                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                                    reqDoc.Onboard_Request__c = obr.Id;
                                    reqDoc.OB_Amendment__c = obA.id;
                                    reqDoc.Certificate_Letter_Authority__c = obA.UBO_Individual_Name__c;
                                    reqDocsToInsert.add(reqDoc);
                                    existRqDocNameList.add(rqDocname);
                                }
                        }
                    }

                    //Added by Vinod for Board Resolution to establish a new company for corporate shareholders                   
                    acDocList = acDocMap.containsKey('ShareResolutionCompany') ? acDocMap.get('ShareResolutionCompany') : new  List<acbox__Action_Document__c> ();
                    //acDocList = acDocMap.get('ShareResolutionCompany');
                    for(acbox__Action_Document__c acDoc : acDocList){
                        if(obA.Role__c.Contains('Shareholder') && obA.Owner_Type__c == 'Corporate'){
                                String rqDocname = acDoc.Name+' - '+obA.Full_Name__c;
                                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                                    // Remove the last character
                                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                                }
                                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                                    reqDoc.Name = rqDocname;
                                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                                    reqDoc.acbox__Record_Id__c = srId;
                                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                                    reqDoc.acbox__Active__c = true;
                                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                                    reqDoc.Onboard_Request__c = obr.Id;
                                    reqDoc.OB_Amendment__c = obA.id;
                                    reqDoc.Certificate_Letter_Authority__c = obA.Full_Name__c;
                                    reqDocsToInsert.add(reqDoc);
                                    existRqDocNameList.add(rqDocname);
                                }
                        }
                    }
                    
                    //Added by shubham to add Company Flow Chart document for UBO Corporate shareholder  
                    acDocList = acDocMap.containsKey('UBO') ? acDocMap.get('UBO') : new  List<acbox__Action_Document__c> ();
                    //acDocList = acDocMap.get('UBO');
                    for(acbox__Action_Document__c acDoc : acDocList){
                        if(obA.Role__c.Contains('UBO') && obA.Owner_Type__c == 'Corporate'){
                                String rqDocname = acDoc.Name+' - '+obA.Full_Name__c;
                                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                                    // Remove the last character
                                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                                }
                                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                                    reqDoc.Name = rqDocname;
                                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                                    reqDoc.acbox__Record_Id__c = srId;
                                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                                    reqDoc.acbox__Active__c = true;
                                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                                    reqDoc.Onboard_Request__c = obr.Id;
                                    reqDoc.OB_Amendment__c = obA.id;
                                    reqDoc.Certificate_Letter_Authority__c = obA.Full_Name__c;
                                    reqDocsToInsert.add(reqDoc);
                                    existRqDocNameList.add(rqDocname);
                                }
                        }
                    }
                }
                //Added by Vinod
               // List<acbox__Action_Document__c> acDocList = acDocMap.get('SecondaryPassport');
               List<acbox__Action_Document__c> acDocList = acDocMap.containsKey('SecondaryPassport') ? acDocMap.get('SecondaryPassport') : new  List<acbox__Action_Document__c> ();
                    
                system.debug('acDocList--->'+acDocList);
                for(acbox__Action_Document__c acDoc : acDocList){
                    system.debug('acDoc--->'+acDoc);
                    if(String.isNotBlank(obA.Do_you_have_dual_Nationality__c) && obA.Do_you_have_dual_Nationality__c == 'Yes'){
                        String rqDocname = acDoc.Name+' - '+obA.Full_Name__c;
                        rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                        if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                            // Remove the last character
                            rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                        }
                        if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                            acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                            reqDoc.Name = rqDocname;
                            reqDoc.acbox__Action_Document__c = acDoc.Id;
                            reqDoc.acbox__Record_Id__c = srId;
                            reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                            reqDoc.acbox__Active__c = true;
                            reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                            reqDoc.Onboard_Request__c = obr.Id;
                            reqDoc.OB_Amendment__c = obA.id;
                            reqDoc.Certificate_Letter_Authority__c = obA.Full_Name__c;
                            reqDocsToInsert.add(reqDoc);
                            existRqDocNameList.add(rqDocname);
                        }
                    }
                }
            }
            //V2.1 -- Added by Shubham to create secondary passport document for Company Registration
           /* if(!secondPassportShrList.isEmpty() && acDocMap.containsKey('SecondaryPassport')){
                for(OB_Amendment__c shr :secondPassportShrList){
                    List<acbox__Action_Document__c> acDocList = acDocMap.get('SecondaryPassport');
                    for(acbox__Action_Document__c acDoc : acDocList){
                        String rqDocname = acDoc.Name+' - '+shr.Full_Name__c;
                        rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                        if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocName)){
                            acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                            reqDoc.Name = rqDocname;
                            reqDoc.acbox__Action_Document__c = acDoc.Id;
                            reqDoc.acbox__Record_Id__c = srId;
                            reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                            reqDoc.acbox__Active__c = true;
                            reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                            reqDoc.Onboard_Request__c = obr.Id;
                            reqDoc.ob_Amendment__c = shr.id;
                            reqDoc.Certificate_Letter_Authority__c = shr.Full_Name__c;
                            reqDocsToInsert.add(reqDoc);
                        }
                    }
                }
            }*/
            //Added by shubham to create doc - Copy of Current 3 months bank statement
            if(obr.Share_Capital__c >=1000000){
                //List<acbox__Action_Document__c> bankStatementDoc = acDocMap.get('ShareCapital'); 
                List<acbox__Action_Document__c> bankStatementDoc = acDocMap.containsKey('ShareCapital') ? acDocMap.get('ShareCapital') : new  List<acbox__Action_Document__c> ();
               
                acbox__Action_Document__c acDoc = bankStatementDoc[0]; 
                String rqDocname = acDoc.Name;
                rqDocname = ((rqDocname.length() <=80) ? rqDocname : (rqDocname.substring(0,80)));
                if(Pattern.matches(specialCharRegex, rqDocname.substring(rqDocname.length() - 1))){
                    // Remove the last character
                    rqDocname = rqDocname.substring(0, rqDocname.length() - 1);
                }
                if(existRqDocNameList.isEmpty() || !existRqDocNameList.contains(rqDocname)){
                    acbox__Request_Document__c reqDoc = new acbox__Request_Document__c();
                    reqDoc.Name = rqDocname;
                    reqDoc.acbox__Action_Document__c = acDoc.Id;
                    reqDoc.acbox__Record_Id__c = srId;
                    reqDoc.acbox__Description__c = acDoc.acbox__Description__c;
                    reqDoc.acbox__Active__c = true;
                    reqDoc.acbox__Status__c=acDoc.acbox__Default_Status__c;
                    reqDoc.Onboard_Request__c = obr.Id;
                    //reqDoc.Certificate_Letter_Authority__c = shName;
                    reqDocsToInsert.add(reqDoc);
                    existRqDocNameList.add(rqDocname);
                } 
            }
            if(!reqDocsToInsert.isEmpty()){
                insert reqDocsToInsert;
            }
            if(!reqDocsToDelete.isEmpty()){
                delete reqDocsToDelete;
            }
           // handleDocGen(srId, 'AOA');
          //  handleDocGen(srId, 'MOA');
        }        
    }

    @AuraEnabled
    public static String createReqFee(String reqId,String reqType){     
      String res = 'Success';  
       processFee(reqId,reqType);
      return res;  
    }
    @AuraEnabled
    public static String createReqFeeModify(String reqId,String reqType){     
      isModify = true;
      String res = 'Success';  
       processFee(reqId,reqType);
      return res;  
    }

    public static void processFee(String srId, String uniqueueCode){
        Onboard_Request__c obr = new Onboard_Request__c();
        List<acbox__Request_Price__c> reqList = new List<acbox__Request_Price__c>();
        obr =[SELECT Id,Urgent_Processing_EC__c,Action_Template__c,Action_Template_Unique_Code__c,Account_Name__c,Account_Name__r.Name,Account_Name__r.Entity_Type__c,Maximum_Allowed_Shareholders__c,Maximum_Allowed_Directors__c,Business_Entity__c FROM Onboard_Request__c where Id=:srId];
        Account eachAccount = [SELECT ID FROM Account where Id=:obr.Account_Name__c];
        if(uniqueueCode =='CompanyRegistration'){ 
            List<acbox__Request_Price__c> reqFeeToInsert = new List<acbox__Request_Price__c>();
            List<acbox__Request_Price__c> reqFeeToDelete = new List<acbox__Request_Price__c>();
            Map<String, String> existRqFeeNameMap  = new Map<String, String>(); 
            Set<String> exstShrNameList = new Set<String>();
            Set<String> exstShrDOBList = new Set<String>();
            Set<String> exstShrCorporateList = new Set<String>();
            //V2.1
            Set<String> secondPassportShrList = new Set<String>();
            Set<String> shareCapitalList = new Set<String>();
			List<OB_License_Activity__c> licActivities = new List<OB_License_Activity__c>();
			String confeServText = '' , conInvText = '', LicenseLatePaymentCalDescription = '', LicenseAllowedActivityCalDescription = '';   
			String  productName = '' ;
			String establishmentCardEAdmin = 'Establishment Card Fee' ;
			string ParentReference = 'Not Found';
			List<String> services = new List<String>();
			Boolean isGeneralTrading = false ;
            Boolean delGenTrading = false;
            Boolean delNewLic = false;
			Boolean generateECFees = true ;
			Boolean stimulusPackagesFound = false ;
            Integer contractDurationInt = 0 ;
            Integer additionalActivityCount = 0;
			boolean additionalSHExists,additionalDRExists = false;
			Integer noOfShareHolders=0,noOfDirectors=0;
            Stimulus_Packages__mdt stimulusPackageRec = new Stimulus_Packages__mdt();
            Set<String> licTypes = new Set<String>();
			Map<string,acbox__Action_Price__c> actionPriceMap  = new Map<string,acbox__Action_Price__c>();
            Integer maximumActivityCountAllowed = 0;
			
            List<OB_Amendment__c> obAmendmentList = [SELECT ID, Owner_Type__c,Onboard_Request__r.Maximum_Allowed_Directors__c, Role__c, Onboard_Request__r.Maximum_Allowed_Shareholders__c,Onboard_Request__r.Account_Name__c FROM OB_Amendment__c WHERE Onboard_Request__c =:obr.Id AND Role__c INCLUDES ('Shareholder', 'Director') AND Status__c='New'];
 
            for(OB_Amendment__c obA : obAmendmentList){
                if(obA.Role__c.Contains('Shareholder')){
                    noOfShareHolders++;
                }
                if(obA.Role__c.Contains('Director') && obA.Owner_Type__c == 'Individual'){
					noOfDirectors++;
                }                               
            }
            
            //Check if Additional Share Holders and Directors Exists. 
            additionalSHExists = (obr.Maximum_Allowed_Shareholders__c != null && (noOfShareHolders > obr.Maximum_Allowed_Shareholders__c)) ? true : false;
            additionalDRExists = (obr.Maximum_Allowed_Directors__c != null && (noOfDirectors > obr.Maximum_Allowed_Directors__c)) ? true : false;
			
            for(Activity_Selection_Config__mdt objConfig : [SELECT Id, Label,DeveloperName, Maximum_Activity__c FROM Activity_Selection_Config__mdt]){
                if(objConfig.Label == obr.Account_Name__r.Entity_Type__c){
                    maximumActivityCountAllowed = Integer.valueOf(objConfig.Maximum_Activity__c);
                }
            }

            for(acbox__Action_Price__c ap : [SELECT ID, Name, Is_Main_Service__c, D356_Product_Name__c, eService_Administration__c,
						eService_Administration__r.ERP_Category__c, eService_Administration__r.Sub_Category__c, 
						acbox__Price__c, acbox__Description__c, acbox__Order__c , 
						eService_Administration__r.Invoice_DDP_File_Id__c, 
						eService_Administration__r.Invoice_Email_Delivery_Method_Id__c,
						eService_Administration__r.Invoice_Prefix__c,
						eService_Administration__r.Company_Type__c   
					FROM acbox__Action_Price__c	WHERE acbox__Action_Template__r.acbox__Unique_Code__c=:uniqueueCode AND acbox__Stage__c = 'Code']){
                actionPriceMap.put(ap.Name,ap);
            }
			
            List<acbox__Request_Price__c> reqFeeExist = [select id,Name,Quantity__c FROM acbox__Request_Price__c where Onboard_Request__c=:obr.Id];
            if(reqFeeExist != null && !reqFeeExist.isEmpty()){
                for(acbox__Request_Price__c reqFee : reqFeeExist){
                    String exstRqFeeName = reqFee.Name;
                    exstRqFeeName = ((exstRqFeeName.length() <=80) ? exstRqFeeName : (exstRqFeeName.substring(0,80)));
                    existRqFeeNameMap.put(exstRqFeeName, exstRqFeeName+'_'+reqFee.Quantity__c);
                    /*if(exstRqFeeName != 'New license fee'){
                        existRqFeeNameMap.put(exstRqFeeName, exstRqFeeName+'_'+reqFee.Quantity__c);
                    }else if(exstRqFeeName == 'New license fee'){
                        existRqFeeNameMap.put(exstRqFeeName, exstRqFeeName+'_1');
                    }*/
                   /* if(reqFee.Name == 'Addition of Licence type' && licTypes.size() - 1 == 0){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(reqFee.Name == 'License fee for each additional class of activity' && additionalActivityCount == 0){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(reqFee.acbox__Action_Document__r.acbox__Type__c == 'GuardianNOC' && (exstShrDOBList == null || !exstShrDOBList.contains(shOwnerName))){
                        reqFeeToDelete.add(reqFee);
                    }
					if(reqFee.Name.startswith('Certificate of Good Standing') && reqFee.acbox__Action_Document__r.acbox__Type__c == 'Corporate' && exstShrCorporateList.contains(shOwnerName)){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(reqFee.acbox__Action_Document__r.acbox__Type__c == 'SecondaryPassport' && secondPassportShrList.contains(shOwnerName)){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(reqFee.acbox__Action_Document__r.acbox__Type__c == 'ShareCapital' && shareCapitalList.contains(reqFee.acbox__Action_Document__r.acbox__Type__c)){
                        reqFeeToDelete.add(reqFee);
                    }*/
                }
            }

            for(OB_License_Activity__c pa : [SELECT ID, Business_Activity__c,Business_Activity__r.Name, 
										Business_Activity__r.Business_Activity_Name__c, 
										Business_Activity__r.Business_Activity_Name_Arabic__c,
										Business_Activity__r.Required_Approval_1__c,
										Business_Activity__r.License_Type__c   
										FROM OB_License_Activity__c WHERE Onboard_Request__c=:obr.Id]){
				licActivities.add(pa);
			}

            if(!licActivities.isEmpty()){
				for(OB_License_Activity__c item : licActivities){
					if(item.Business_Activity__r.Business_Activity_Name__c == 'General Trading') isGeneralTrading = true ;
					licTypes.add(item.Business_Activity__r.License_Type__c);
				} 
			}

			system.debug('===additionalSHExists='+additionalSHExists+'===='+additionalDRExists +existRqFeeNameMap);
            //system.debug('=noOfShareHolders=='+noOfShareHolders+'=noOfDirectors==='+noOfDirectors+'==maxAllowedSh=='+obr.Maximum_Allowed_Shareholders__c+'=maxAllowedDir==='+ORDER BY.Maximum_Allowed_Directors__c);                          
            if(!actionPriceMap.isEmpty()){
                if(additionalSHExists){  
                    if((!existRqFeeNameMap.containsKey('Additional Shareholders Fees') && additionalSHExists) || (existRqFeeNameMap.containsKey('Additional Shareholders Fees') && existRqFeeNameMap.get('Additional Shareholders Fees') != 'Additional Shareholders Fees'+'_'+(noOfShareHolders - Integer.valueOf(obr.Maximum_Allowed_Shareholders__c)))){
                        acbox__Request_Price__c rp = createFee(actionPriceMap.get('Additional Shareholders Fees'), obr.Id, null, noOfShareHolders - Integer.valueOf(obr.Maximum_Allowed_Shareholders__c));
                        reqFeeToInsert.add(rp);
                        existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                    }
                }
                if(additionalDRExists){
                    if((!existRqFeeNameMap.containsKey('Additional Directors Fees') && additionalDRExists) ||(existRqFeeNameMap.containsKey('Additional Directors Fees') && existRqFeeNameMap.get('Additional Directors Fees') != 'Additional Directors Fees'+'_'+(noOfDirectors - Integer.valueOf(obr.Maximum_Allowed_Directors__c)))){
                        acbox__Request_Price__c rp = createFee(actionPriceMap.get('Additional Directors Fees'), obr.Id, null, noOfDirectors - Integer.valueOf(obr.Maximum_Allowed_Directors__c));
                        reqFeeToInsert.add(rp);
                        existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                    }
                }
                //Establishment Card - Urgent Processing
                if(!existRqFeeNameMap.containsKey('Urgent Processing - Establishment Card') && obr.Urgent_Processing_EC__c == true){
                     acbox__Request_Price__c rp = createFee(actionPriceMap.get('Urgent Processing - Establishment Card'), obr.Id, null, 1);
                     reqFeeToInsert.add(rp);
                     existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                }
                //Establishment Card Fees
                /*if(!existRqFeeNameMap.containsKey('Establishment Card Fees')){
                     acbox__Request_Price__c rp = createFee(actionPriceMap.get('Establishment Card Fees'), obr.Id, null, 1);
                     reqFeeToInsert.add(rp);
                     existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                }*/
                //New license fee

                if(isGeneralTrading && !existRqFeeNameMap.containsKey('License fee for General Trading')){
                    acbox__Request_Price__c rp = createFee(actionPriceMap.get('License fee for General Trading'), obr.Id, null, 1);
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                    delNewLic = existRqFeeNameMap.containsKey('New license fee') ? true : false ;

                }else if (!isGeneralTrading  && !existRqFeeNameMap.containsKey('New license fee'))  {
                    acbox__Request_Price__c rp = createFee(actionPriceMap.get('New license fee'), obr.Id, null, 1);
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                    delGenTrading = existRqFeeNameMap.containsKey('License fee for General Trading') ? true : false ;

                }
                
                // if(!existRqFeeNameMap.containsKey('New license fee')){
                //     acbox__Request_Price__c rp = createFee(actionPriceMap.get('New license fee'), obr.Id, null, 1);
                //     reqFeeToInsert.add(rp);
                //     existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                // }
                //New PO Box Registration Fees
                if(!existRqFeeNameMap.containsKey('New PO Box Registration Fees')){  
                    acbox__Request_Price__c rp = createFee(actionPriceMap.get('New PO Box Registration Fees'), obr.Id, null, 1);
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                }
                //New PO Box loyalty Fees
                if(!existRqFeeNameMap.containsKey('New PO Box loyalty Fees')){  
                    acbox__Request_Price__c rp = createFee(actionPriceMap.get('New PO Box loyalty Fees'), obr.Id, null, 1);
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                }
            }
			LicenseInvoiceActions.ResponseWrapper resp = LicenseInvoiceActions.GetHigherCompanyActivityEntitlement(eachAccount, 'New License');
            system.debug('====reps==='+resp);
						
			for(eService_Admin_to_Invoice__mdt item : [select id , Field_Source__c , Field_Destination__c from eService_Admin_to_Invoice__mdt]){
               confeServText += item.Field_Source__c + ' , ' ;
               conInvText += item.Field_Destination__c + ' , ' ;
            }
            if(confeServText.length() > 0){
                confeServText = ' ' + confeServText.substring(0 , confeServText.length() - 2)  + ' ' ;
            } 
            if(conInvText.length() > 0){
                conInvText = ' ' + conInvText.substring(0 , conInvText.length() - 2)  + ' ' ;
            } 
			/*
			for(QuoteLineItem item : [SELECT ID, Inventory_Unit__r.Product_Type__r.Name FROM QuoteLineItem 
									WHERE Quote.Status = 'Signed' AND Inventory_Unit__c != null 
									AND Quote.AccountId =:obr.Account_Name__c]){
                productName = item.Inventory_Unit__r.Product_Type__r.Name;
            }      
         
           list<Stimulus_Packages__mdt> lststimulusPackages = [select id, Label, EC_New_Service_Admin__c, EC_Renewal_Service_Admin__c , Duration__c, License_Discount__c, Lease_Discount__c from Stimulus_Packages__mdt where Product_Name__c = : productName AND Duration__c = 1 limit 1];
            if(lststimulusPackages.size() > 0){
                stimulusPackagerec = lststimulusPackages[0];
                stimulusPackagesFound = true ; 
                establishmentCardEAdmin = stimulusPackageRec.EC_New_Service_Admin__c ;  
            } 
			*/			
               
            //integer allowedActivityCount = (resp != null && resp.ActivityAllowedProductType != null) ? resp.ActivityAllowedProductType : 3; 
            integer currentActivityCount = licActivities.size() > 0 ? licActivities.size() : 0;          
            string ProdCategoryDesc = (resp != null && resp.ProductTypeActivityEntitlement != '') ? resp.ProductTypeActivityEntitlement : 'Default';
            if(resp != null ) ParentReference = resp.ParentObjectRecordId;           
            /*if(currentActivityCount > allowedActivityCount) {
                system.debug('##$$%%$#'+currentActivityCount+'**&&&^^%'+allowedActivityCount);                    
                additionalActivityCount = currentActivityCount - allowedActivityCount ;              
                LicenseAllowedActivityCalDescription =  ' Product Category ' + ProdCategoryDesc +
                                ', Today Date ' + system.today().format() +
                                ', No of Current Activities ' + currentActivityCount + 
                                ', No of Allowed Activities ' + allowedActivityCount + 
                                ', No of Additional Activities ' + additionalActivityCount +
                                ', Reference ID ' + ParentReference ;
            }*/
            if(currentActivityCount > maximumActivityCountAllowed) {                 
                additionalActivityCount = currentActivityCount - maximumActivityCountAllowed;              
            }           
            system.debug('##$$##$$'+additionalActivityCount);
            if(additionalActivityCount > 0 ){
                services.add('License fee for each additional class of activity'); 
            }
            String servicesStr  = ' in (' ;
            if (isGeneraltrading ){
                services.add('License fee for General Trading');
                servicesStr += '\'License fee for General Trading\','  ;
            }
            else{             
                    services.add('License fee (per class up to 10 activities from same class)'); 
                    servicesStr += '\'License fee (per class up to 10 activities from same class)\','  ;   
            }
            //Added by Vinod
            if(licTypes.size() > 1){
                services.add('Addition of Licence type');
            }
            //services.add(System.Label.LBL_POBOX_REGISTRATION_FEES);
            //services.add(System.Label.LBL_POBOX_LOYALTY);
            servicesStr = servicesStr.substring(0 , servicesStr.length()-1) + ') ';
            
            if(reqFeeExist != null && !reqFeeExist.isEmpty()){
                for(acbox__Request_Price__c reqFee : reqFeeExist){
                    String exstRqFeeName = reqFee.Name;
                    String uniqueName = exstRqFeeName+'_'+reqFee.Quantity__c;
                    system.debug('uniqueName--->'+uniqueName);
                    exstRqFeeName = ((exstRqFeeName.length() <=80) ? exstRqFeeName : (exstRqFeeName.substring(0,80)));
                    if(exstRqFeeName == 'Addition of Licence type' && uniqueName != 'Addition of Licence type'+'_'+(licTypes.size() - 1)){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(exstRqFeeName == 'License fee for each additional class of activity' && uniqueName != 'License fee for each additional class of activity'+'_'+additionalActivityCount){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(exstRqFeeName == 'Additional Shareholders Fees' && uniqueName != 'Additional Shareholders Fees'+'_'+(noOfShareHolders - Integer.valueOf(obr.Maximum_Allowed_Shareholders__c))){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(exstRqFeeName == 'Additional Directors Fees' && uniqueName != 'Additional Directors Fees'+'_'+(noOfDirectors - Integer.valueOf(obr.Maximum_Allowed_Directors__c))){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(exstRqFeeName == 'New license fee' &&  delNewLic ){
                        reqFeeToDelete.add(reqFee);
                    }
                    if(exstRqFeeName == 'License fee for General Trading' &&  delGenTrading ){
                        reqFeeToDelete.add(reqFee);
                    }

                    /*
                    if(exstRqFeeName == 'New license fee' && uniqueName != 'New license fee'+'_1'){
                        reqFeeToDelete.add(reqFee);
                    }*/
                }
            }

			Id actionPriceId;
            for(Receipt_Template__c item : [select Display_Name__c, Knowledge_Fee__r.Service_GL_Code__c , Service_Identifier__c , Amount__c ,Id,Knowledge_Fee__c , Require_Knowledge_Fee__C , Knowledge_Fee__r.Amount__c from Receipt_Template__c where Service_Identifier__c in : services ]){
                system.debug('$$$ Iterating item '+item.Display_Name__c);
                actionPriceId = (actionPriceMap.containskey(item.Display_Name__c)) ? (actionPriceMap.get(item.Display_Name__c).Id) : null;
                //Addition of Licence type
                if((!existRqFeeNameMap.containsKey('Addition of Licence type') ||(existRqFeeNameMap.containsKey('Addition of Licence type') && existRqFeeNameMap.get('Addition of Licence type') != ('Addition of Licence type'+'_'+(licTypes.size()- 1)))) && item.Display_Name__c == 'Addition of Licence type'){
                    if(licTypes.size() > 1){
                       // for(Integer i = 0 ; i < licTypes.size() - 1 ;  i++){ 
                          /*  acbox__Request_Price__c rp = new acbox__Request_Price__c(Name=item.Display_Name__c, acbox__Status__c='Review',
                                                            acbox__Price__c=item.Amount__c, acbox__Description__c=item.Display_Name__c,
                                                            acbox__Record_Id__c=obr.Id, Onboard_Request__c=obr.Id, Quantity__c=licTypes.size()-1,
                                                            acbox__Action_Price__c =actionPriceId );
                            */
                            acbox__Request_Price__c rp = createFee(actionPriceMap.get('Addition of Licence type'), obr.Id, null, licTypes.size()-1);
                            reqFeeToInsert.add(rp);
                            existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                       // }
                    }
                }
                //License fee for each additional class of activity
                if((!existRqFeeNameMap.containsKey('License fee for each additional class of activity') ||(existRqFeeNameMap.containsKey('License fee for each additional class of activity') && existRqFeeNameMap.get('License fee for each additional class of activity') != ('License fee for each additional class of activity'+'_'+additionalActivityCount))) && item.Display_Name__c == 'License fee for each additional class of activity'){  
                    /*acbox__Request_Price__c rp = new acbox__Request_Price__c(Name=item.Display_Name__c, acbox__Status__c='Review',
                                                        acbox__Price__c = (item.Amount__c),acbox__Description__c=item.Display_Name__c,
                                                        acbox__Record_Id__c=obr.Id, Onboard_Request__c=obr.Id, Quantity__c=additionalActivityCount,
                                                        acbox__Action_Price__c =actionPriceId );
                    reqFeeToInsert.add(rp);*/
                    acbox__Request_Price__c rp = createFee(actionPriceMap.get('License fee for each additional class of activity'), obr.Id, null, additionalActivityCount);
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                }
                /*
                //New PO Box Registration Fees
                if(!existRqFeeNameMap.containsKey('New PO Box Registration Fees') && item.Service_Identifier__c == 'New license fee'){  
                    acbox__Request_Price__c rp = new acbox__Request_Price__c(Name=item.Display_Name__c, acbox__Status__c='Review',
                                                        acbox__Price__c = (item.Amount__c),acbox__Description__c=item.Display_Name__c,
                                                        acbox__Record_Id__c=obr.Id, Onboard_Request__c=obr.Id, Quantity__c=1,
                                                        acbox__Action_Price__c =actionPriceId );
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_1');
                }
                //New PO Box loyalty Fees
                if(!existRqFeeNameMap.containsKey('New PO Box loyalty Fees') && item.Service_Identifier__c == 'New PO Box loyalty Fees'){  
                    acbox__Request_Price__c rp = new acbox__Request_Price__c(Name=item.Display_Name__c, acbox__Status__c='Review',
                                                        acbox__Price__c = (item.Amount__c),acbox__Description__c=item.Display_Name__c,
                                                        acbox__Record_Id__c=obr.Id, Onboard_Request__c=obr.Id, Quantity__c=1,
                                                        acbox__Action_Price__c =actionPriceId );
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_1');
                }
                */
                //New License Fee
                /*else if(!existRqFeeNameMap.containsKey('New license fee') ||(existRqFeeNameMap.containsKey('New license fee') && existRqFeeNameMap.get('New license fee') != ('New license fee'+'_1')) && item.Service_Identifier__c == 'New license fee'){  
                    acbox__Request_Price__c rp = new acbox__Request_Price__c(Name=item.Display_Name__c, acbox__Status__c='Review',
                                                        acbox__Price__c = (item.Amount__c),acbox__Description__c=item.Display_Name__c,
                                                        acbox__Record_Id__c=obr.Id, Onboard_Request__c=obr.Id, Quantity__c=1,
                                                        acbox__Action_Price__c =actionPriceId );
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_1');
                }*/
                else{
                  /*  Invoice_Line_Item__c  ILI =  new Invoice_Line_Item__c (Service__c = item.Id, Amount__c = item.Amount__c);               
                    if((item.Service_Identifier__c =='License fee for General Trading' ||  
                        item.Service_Identifier__c == 'License fee (per class up to 10 activities from same class)'))
                    {
                        if(stimulusPackagesFound){                            
                            ILI.Amount__c = (ILI.Amount__c - ((ILI.Amount__c * stimulusPackagerec.License_Discount__c)/100))  ;
                        }
                    }
                    acbox__Request_Price__c rp = new acbox__Request_Price__c(Name=item.Display_Name__c, acbox__Status__c='Review',
                                                        acbox__Price__c= ILI.Amount__c, acbox__Description__c=item.Display_Name__c,
                                                        acbox__Record_Id__c=obr.Id, Onboard_Request__c=obr.Id, Quantity__c=1,
                                                        acbox__Action_Price__c =actionPriceId);
                    reqFeeToInsert.add(rp);
                    existRqFeeNameMap.put(rp.Name, rp.Name+'_'+rp.Quantity__c);
                    */
                }               
            }
           
            if(!reqFeeToInsert.isEmpty()){
                insert reqFeeToInsert;
            }
            if(!reqFeeToDelete.isEmpty()){
                delete reqFeeToDelete;
            }   
        }    
    }
	
	public static acbox__Request_Price__c createFee(acbox__Action_Price__c price, Id obId, Id amId, Integer quantity){
        acbox__Request_Price__c actionPrice = new acbox__Request_Price__c();
        actionPrice.Name                    = price.Name;
        actionPrice.acbox__Action_Price__c  = price.Id;
        actionPrice.acbox__Description__c   = price.acbox__Description__c;
        actionPrice.acbox__Price__c         = price.acbox__Price__c;
        if(isModify){
            actionPrice.acbox__Status__c        = 'Added';
        }else{
            actionPrice.acbox__Status__c        = 'Review';
        }
        actionPrice.acbox__Order__c         = price.acbox__Order__c;
        actionPrice.acbox__Record_Id__c     = obId;
        actionPrice.Onboard_Request__c      = obId;
        actionPrice.OB_Amendment__c         = amId;
        actionPrice.Quantity__c             = quantity;
        return actionPrice;
    }

    /*private static void handleAoADocGen(Id srId){
        list<acbox__Request_Document__c> exReqDoc = [SELECT ID FROM acbox__Request_Document__c WHERE Onboard_Request__c=:srId 
                                                        AND Name = 'Article Of Association' limit 1];
        if(exReqDoc.isEmpty()){
            list<acbox__Action_Document__c> aOa = [SELECT ID,Name FROM acbox__Action_Document__c WHERE Name='Article Of Association' limit 1];
            if(!aOa.isEmpty()){
                acbox__Request_Document__c reqDoc = new acbox__Request_Document__c(
                                            Name=aOa[0].Name,
                                            acbox__Status__c='Generated',
                                            acbox__Action_Document__c=aOa[0].Id,
                                            acbox__Record_Id__c = srId,
                                            RecordTypeId=system.label.ReqDocumentDefaultRT,
                                            acbox__Active__c=true,
                                            // acbox__File_Document_SF_18__c=,
                                            Onboard_Request__c=srId
                                            );
                insert reqDoc;
                handleMoADocGen(srId, 'AOA');
                generateAoAdocument(reqDoc.Id);
            }
        }else{
            list<Attachment> attLst = [Select id from Attachment where ParentId=:exReqDoc[0].Id];
            delete attLst;
            generateAoAdocument(exReqDoc[0].Id);
        }
    }*/
	
    @testVisible
    private static void handleDocGen(Id srId, string docName){
        list<acbox__Request_Document__c> exReqDoc = [SELECT ID FROM acbox__Request_Document__c WHERE Onboard_Request__c=:srId 
                                                        AND acbox__Action_Document__r.acbox__Type__c = :docName 
                                                        AND acbox__Action_Document__r.acbox__Action_template__r.Name = 'Company Registration' 
                                                     limit 1];
        if(exReqDoc.isEmpty()){
            list<acbox__Action_Document__c> aOa = [SELECT ID,Name FROM acbox__Action_Document__c WHERE acbox__Type__c=:docName 
                                                    AND acbox__Action_template__r.Name = 'Company Registration' limit 1];
            if(!aOa.isEmpty()){
                acbox__Request_Document__c reqDoc = new acbox__Request_Document__c(
                                            Name=aOa[0].Name,
                                            acbox__Status__c='Generated',
                                            acbox__Action_Document__c=aOa[0].Id,
                                            acbox__Record_Id__c = srId,
                                            RecordTypeId=system.label.ReqDocumentDefaultRT,
                                            acbox__Active__c=true,
                                            // acbox__File_Document_SF_18__c=,
                                            Onboard_Request__c=srId
                                            );
                insert reqDoc;
                if(docName == 'AOA'){
                    generateAoAdocument(reqDoc.Id);
                }else if(docName == 'MOA'){
                    generateMoAdoc(reqDoc.Id);                   
                }
            }
        }else{
            list<Attachment> attLst = [Select id from Attachment where ParentId=:exReqDoc[0].Id];
            delete attLst;

            if(docName == 'AOA'){
                generateAoAdocument(exReqDoc[0].Id);
            }else if(docName == 'MOA'){
                generateMoAdoc(exReqDoc[0].Id);                   
            }
        }
    }

    @future(callout=true)
    public static void generateAoAdocument(Id reqDocId){
        Loop.loopMessage lm = new Loop.loopMessage();
        lm.requests.add(new Loop.loopMessage.loopMessageRequest(reqDocId,system.label.CR_AoADdpID, new Map<string, string> { 'deploy' => system.label.CR_AoADeployId} ));
        lm.sendAllRequests();
    }
    @future(callout=true)
    public static void generateMoAdoc(Id reqDocId){
        Loop.loopMessage lm = new Loop.loopMessage();
        lm.requests.add(new Loop.loopMessage.loopMessageRequest(reqDocId,system.label.CR_MoADdpID, new Map<string, string> { 'deploy' => system.label.CR_MoADeployId} ));
        lm.sendAllRequests();
    }

    @AuraEnabled(cacheable=false)
    public static List<OB_Amendment__c> getSelectedAccInfo(String accId){
       List<OB_Amendment__c> OBAmendList = new List<OB_Amendment__c>();
       String sObjName = '',email = '',mobileNo = ''; 
       List<Account> accList =  [select id,Name,Building_Villa_Flat__c,Street_Name__c,Area__c,
          City_Town__c,Country_Address__c,Billing_PO_Box_Postal_Code__c
          from Account where id=:accId];
      if(accList != null && !accList.isEmpty()){
        Account pa = accList[0];
           OB_Amendment__c obA = new OB_Amendment__c();
            obA.Address2__c = pa.Building_Villa_Flat__c;
            obA.Street_Address__c= pa.Street_Name__c;
			obA.Address1__c = pa.Area__c;
            obA.City__c = pa.City_Town__c;
            obA.Po_Box_Postal_Code__c = pa.Billing_PO_Box_Postal_Code__c;
            obA.Country__c = pa.Country_Address__c;
            obA.City_of_P_O_Box__c = '';      
           OBAmendList.add(obA);
       }   
        return OBAmendList;
    }
    
     public static acbox__Request_Document__c returnReqDocument(acbox__Action_Document__c rDoc, Id srId, string anEng, string anAr, boolean isExt, string docName, Id amId){
        acbox__Request_Document__c reqDoc   = new acbox__Request_Document__c();
        reqDoc.Name                         = docName;//'Activity External - ' + anEng;
        reqDoc.acbox__Action_Document__c    = rDoc.Id;
        reqDoc.acbox__Record_Id__c          = srId;
        reqDoc.acbox__Description__c        = rDoc.acbox__Description__c;
        reqDoc.acbox__Active__c             = true;
        reqDoc.acbox__Status__c             = rDoc.acbox__Default_Status__c;
        reqDoc.Onboard_Request__c           = srId;
        reqDoc.OB_Amendment__c              = amId;
        if(isExt){
            reqDoc.Certificate_Letter_Authority__c          = anEng;
            reqDoc.Certificate_Letter_Authority_Arabic__c   = anAr;reqDoc.acbox__Record_Id__c          = srId;
            reqDoc.acbox__Description__c        = rDoc.acbox__Description__c;
            reqDoc.acbox__Active__c             = true;
            reqDoc.acbox__Status__c             = rDoc.acbox__Default_Status__c;
            reqDoc.Onboard_Request__c           = srId;
            reqDoc.acbox__Action_Document__c    = rDoc.Id;
            reqDoc.acbox__Record_Id__c          = srId;
            //reqDoc.Name                                     = 'Activity External - ' + anEng;
        }else{
            //reqDoc.Name  = 'Upload ' + anEng + ' NOC';
        }
        return reqDoc;
    }
    
    public static string returnEmailcontent(string content , OB_Amendment__c am, string name, string type){
        content = content.replace('ActionTemplateName', am.Onboard_Request__r.Action_Template_Name__c);
        content = content.replace('CompanyName', am.Onboard_Request__r.Account_Name__r.Name);
        //content = content.replace('{type}', name);
        if(type == 'AOA'){
            content = content.replace('{type}', 'Addendum to the Article of Association');
        }
        return content;
    }

    @AuraEnabled(cacheable=false)
    public static void updateBOPercentage(string srId) {
        List<OB_Amendment__c> updateAmendment = new List<OB_Amendment__c>();
        for(OB_Amendment__c objAmendement : [Select Id,Name,Ownership_Percentage__c,Status_of_BO_Ownership__c, Is_UBO__c, Role__c FROM OB_Amendment__c WHERE Onboard_Request__c=:srId]){
            if(objAmendement.Is_UBO__c == true){
                if(objAmendement.Ownership_Percentage__c !=null){
                    objAmendement.Status_of_BO_Ownership__c = objAmendement.Ownership_Percentage__c;
                }
            }else{
                objAmendement.Status_of_BO_Ownership__c = null;
            }
            updateAmendment.add(objAmendement);
        }
        if(!updateAmendment.isEmpty()){
            update updateAmendment;
        } 
    }
    
    //Vinod Changes - End
   /*
    public class AddBoardMemberWrapper{
        @AuraEnabled public String EntityType {get;set;}
        @AuraEnabled public String maxAllowedShareholders {get;set;}
        @AuraEnabled public String maxAllowedDirectors {get;set;}
       // @AuraEnabled public List<Add_Board_Member_Config__mdt> AddBoardMemberMetadataList {set;get;}
    } 
    */
    //Registration Activities Wrapper class
    public class RegistrationActivityWrapper{
        @AuraEnabled public Boolean MainActivity {set;get;}
        @AuraEnabled public String Name {set;get;}
        @AuraEnabled public String BusinessActivity {set;get;}
        @AuraEnabled public String BusinessActivityArabicName {set;get;}
        @AuraEnabled public String Category {set;get;}
        @AuraEnabled public String LicenseType {set;get;}
    }
    
    public class OCRWrapper {
        @AuraEnabled
        public String firstName{ get; set; }
        @AuraEnabled
        public String lastName{ get; set; }
        @AuraEnabled
        public String nationality{ get; set; }
        @AuraEnabled
        public String passportDateofExpiry{ get; set; }
        @AuraEnabled
        public String passportNo{ get; set; }
        @AuraEnabled
        public String placeofissue{ get; set; }
        @AuraEnabled
        public String emiratesIDName{ get; set; }
        @AuraEnabled
        public String emiratesIDDateofExpiry{ get; set; }
        @AuraEnabled
        public String emiratesIDNo{ get; set; }
        @AuraEnabled
        public boolean isValidDocument{ get; set; }
        @AuraEnabled
        public String errorMessage{ get; set; }
        @AuraEnabled
        public String dateOfBirth {get; set;}
        @AuraEnabled
        public String gender {get; set;}
        @AuraEnabled
        public String passportDateofIssue{ get; set; }
        @AuraEnabled
        public String docUrl{ get; set; }
    }
    
    
}