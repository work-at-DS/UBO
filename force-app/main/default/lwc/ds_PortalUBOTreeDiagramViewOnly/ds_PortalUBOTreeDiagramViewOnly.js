import { LightningElement, api } from 'lwc';
import getInit from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getRelationshipsAndParams';
import getApplicationDetails from '@salesforce/apex/ds_PortalApplicationService.getFormDetailsCopy';

export default class Ds_PortalUBOTreeDiagramViewOnly extends LightningElement {
    @api recordId;
    @api objectApiName;
    @api fieldApiName; // the long-text field storing the tree JSON

    isLoading = true;
    error;
    relationships = [];
    uboSectionDetail = [];
    actionTempId ;
    currentFlowId;
    serviceRequestId;
  connectedCallback() {
    this.loadAll();
  }

  async loadAll() {
    this.isLoading = true;
    this.error = undefined;
    try {
      // 1) Get relationships JSON + derived params from the record tree
      const dto = await getInit({
        recordId: this.recordId,
        objectApiName: this.objectApiName,
        fieldApiName: this.fieldApiName
      });

      if (dto?.relationshipsJson) {
        try {
          this.relationships = JSON.parse(dto.relationshipsJson);
        } catch (e) {
          throw new Error('Invalid JSON in relationships field: ' + e.message);
        }
      } else {
        this.relationships = [];
      }

      // 2) With (serviceRequestId, actionTempId, currentFlowId) → fetch UBO sections only
      if (dto?.serviceRequestId && dto?.actionTempId && dto?.currentFlowId) {
            this.actionTempId = dto.actionTempId;
            this.currentFlowId = dto.currentFlowId;
            this.serviceRequestId = dto.serviceRequestId;
      } 
    } catch (e) {
      this.error = e?.body?.message || e?.message || 'Failed to load data.';
      // eslint-disable-next-line no-console
      console.error(e);
    } finally {
      this.isLoading = false;
    }
  }

  // pick only sections whose type includes 'UBO_TREE_MAP', and clear defaults
  extractUboSections(sectionDetails = []) {
    const out = [];
    (sectionDetails || []).forEach(sec => {
      const type = sec?.section?.acbox__Type__c;
      if (type && type.includes('UBO_TREE_MAP')) {
        const copy = JSON.parse(JSON.stringify(sec));
        (copy.sectionDetails || []).forEach(f => { f.acbox__Default_Value__c = ''; });
        out.push(copy);
      }
    });
    return out;
  }
}
