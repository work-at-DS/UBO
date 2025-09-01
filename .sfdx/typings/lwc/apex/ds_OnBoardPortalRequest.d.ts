declare module "@salesforce/apex/ds_OnBoardPortalRequest.checkCorporateUBO" {
  export default function checkCorporateUBO(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.checkCorporateUBOMotherCompany" {
  export default function checkCorporateUBOMotherCompany(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getVisaAndEstablishmentDetails" {
  export default function getVisaAndEstablishmentDetails(param: {onboardRequestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createsObjectRecord" {
  export default function createsObjectRecord(param: {record: any, contentVersionId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.updateAmendmentRecord" {
  export default function updateAmendmentRecord(param: {record: any, contentVersionId: any, role: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.updatesObjectRecord" {
  export default function updatesObjectRecord(param: {record: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getTemplateDetails" {
  export default function getTemplateDetails(param: {recid: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getactionTemplateDetail" {
  export default function getactionTemplateDetail(param: {actTempId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getAccountDetails" {
  export default function getAccountDetails(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getAccountDetailsLr" {
  export default function getAccountDetailsLr(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getLocationDetails" {
  export default function getLocationDetails(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getAccountLeaseDetails" {
  export default function getAccountLeaseDetails(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createLicenseActivitiesDocs" {
  export default function createLicenseActivitiesDocs(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.attachFileToRecord" {
  export default function attachFileToRecord(param: {contentVersionId: any, record: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.deleteRelatedDocuments" {
  export default function deleteRelatedDocuments(param: {reqId: any, recId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.deleteAmendmentRecord" {
  export default function deleteAmendmentRecord(param: {recordId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.deleteUploadedFiles" {
  export default function deleteUploadedFiles(param: {oaRecordId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getExistingShareholderFromAccount" {
  export default function getExistingShareholderFromAccount(param: {recordId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getExistingDataFromAccount" {
  export default function getExistingDataFromAccount(param: {recordId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getExistingAndNewAmmendmentRecords" {
  export default function getExistingAndNewAmmendmentRecords(param: {recordId: any, role: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getExistingAndNewAmmendmentRecordsWithRole" {
  export default function getExistingAndNewAmmendmentRecordsWithRole(param: {recordId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.duplicateRecordCheck" {
  export default function duplicateRecordCheck(param: {recId: any, role: any, passportNumber: any, emailAddress: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.duplicateAmendmentRecordCheck" {
  export default function duplicateAmendmentRecordCheck(param: {recId: any, role: any, passportNumber: any, amendmentId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createAmendmentforExistingRelation" {
  export default function createAmendmentforExistingRelation(param: {recIds: any, reqId: any, role: any, status: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createAmendmentforDiretor" {
  export default function createAmendmentforDiretor(param: {recId: any, reqId: any, role: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createAmendmentforShareholder" {
  export default function createAmendmentforShareholder(param: {recId: any, reqId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getAmmendmentRecords" {
  export default function getAmmendmentRecords(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getGeneralAmmendmentRecord" {
  export default function getGeneralAmmendmentRecord(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getExistingShareHoldersData" {
  export default function getExistingShareHoldersData(param: {onboardRecordId: any, role: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getRelatedRecords" {
  export default function getRelatedRecords(param: {onboardRecordId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getSelectedRelationInfo" {
  export default function getSelectedRelationInfo(param: {relationId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getSelectedAmendementInfo" {
  export default function getSelectedAmendementInfo(param: {relationId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getDocumentOCR" {
  export default function getDocumentOCR(param: {conVersionID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getGeneralAmmendmentRecords" {
  export default function getGeneralAmmendmentRecords(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getNextPageflowDetails" {
  export default function getNextPageflowDetails(param: {previousPageFlow: any, actionTemplateID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getPreviousPageflowDetails" {
  export default function getPreviousPageflowDetails(param: {previousPageFlow: any, actionTemplateID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getRegistrationActivities" {
  export default function getRegistrationActivities(param: {accountId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createReqDocuments" {
  export default function createReqDocuments(param: {reqId: any, reqType: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createReqFee" {
  export default function createReqFee(param: {reqId: any, reqType: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.createReqFeeModify" {
  export default function createReqFeeModify(param: {reqId: any, reqType: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.getSelectedAccInfo" {
  export default function getSelectedAccInfo(param: {accId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_OnBoardPortalRequest.updateBOPercentage" {
  export default function updateBOPercentage(param: {srId: any}): Promise<any>;
}
