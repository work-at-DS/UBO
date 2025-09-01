declare module "@salesforce/apex/ds_lex_PortalRequestController.getSingleSectionDetail" {
  export default function getSingleSectionDetail(param: {sectionDetailId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getDocumentDescription" {
  export default function getDocumentDescription(param: {actId: any, cmpName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getPicklistValues" {
  export default function getPicklistValues(param: {objName: any, fieldName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.showChangeStatus" {
  export default function showChangeStatus(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getTemplateUniqueCode" {
  export default function getTemplateUniqueCode(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getApplicationHistory" {
  export default function getApplicationHistory(param: {serviceRequestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getActionForService" {
  export default function getActionForService(param: {requestActionID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getServiceName" {
  export default function getServiceName(param: {requestID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.completeReUploadReqDoc" {
  export default function completeReUploadReqDoc(param: {srId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.updateAction" {
  export default function updateAction(param: {raObject: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getUserDetails" {
  export default function getUserDetails(): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getAllActionTemplates" {
  export default function getAllActionTemplates(): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getConsentDescription" {
  export default function getConsentDescription(param: {pageFlowId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getActionTemplateDetails" {
  export default function getActionTemplateDetails(param: {actionTemplateID: any, serviceRequestID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.createServiceRequest" {
  export default function createServiceRequest(param: {sObj: any, lstsObj: any, parentObjectFieldName: any, actionPageFlowId: any, hasChangeFieldAPIName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.updateServiceRequest" {
  export default function updateServiceRequest(param: {sObj: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.deleteServiceRequest" {
  export default function deleteServiceRequest(param: {sObj: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.updateServiceReqWithNewPhoto" {
  export default function updateServiceReqWithNewPhoto(param: {serviceRequestId: any, cdId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getRequestDocumentById" {
  export default function getRequestDocumentById(param: {recId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getRequestDocuments" {
  export default function getRequestDocuments(param: {requestId: any, cmd: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.createNewDocuments" {
  export default function createNewDocuments(param: {requestId: any, requestDocName: any, requestDocDescription: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getUploadedDocumentDetails" {
  export default function getUploadedDocumentDetails(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getRequest" {
  export default function getRequest(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getPriceList" {
  export default function getPriceList(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getInvList" {
  export default function getInvList(): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getAttachmentId" {
  export default function getAttachmentId(param: {parentId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.getPriceListInvoice" {
  export default function getPriceListInvoice(param: {requestId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.deleteUploadedDocuments" {
  export default function deleteUploadedDocuments(param: {contentDocumentId: any, requestDocID: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.sharePaymentLink" {
  export default function sharePaymentLink(param: {requestId: any, requestName: any, objName: any, email: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.doPaymentFromWallet" {
  export default function doPaymentFromWallet(param: {requestId: any, objName: any, requestName: any, accountId: any, customerTransactionId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.startNoqodiPayment" {
  export default function startNoqodiPayment(param: {requestId: any, objName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalRequestController.authorizePayment" {
  export default function authorizePayment(param: {response: any}): Promise<any>;
}
