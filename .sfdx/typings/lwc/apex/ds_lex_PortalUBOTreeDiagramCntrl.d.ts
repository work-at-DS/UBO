declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getCountryName" {
  export default function getCountryName(param: {countryId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getGUID" {
  export default function getGUID(): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.deleteUBORecs" {
  export default function deleteUBORecs(param: {uboIds: any, objectApiName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getRelationshipsAndParams" {
  export default function getRelationshipsAndParams(param: {recordId: any, objectApiName: any, fieldApiName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getNamesByIds" {
  export default function getNamesByIds(param: {ids: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.createOrUpsertUboNode" {
  export default function createOrUpsertUboNode(param: {inputJson: any, objectApiName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.commitUboTree" {
  export default function commitUboTree(param: {parentId: any, nodesParam: any, treeJson: any, deletedExternalIds: any, objectApiName: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.uploadAttachment" {
  export default function uploadAttachment(param: {parentId: any, fileName: any, base64Data: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.deleteDraftNodesForServiceRequest" {
  export default function deleteDraftNodesForServiceRequest(param: {serviceRequestId: any, objectApiName: any, rootAmendmentId: any}): Promise<any>;
}
declare module "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getUboSectionsOnly" {
  export default function getUboSectionsOnly(param: {actionTempId: any, srId: any}): Promise<any>;
}
