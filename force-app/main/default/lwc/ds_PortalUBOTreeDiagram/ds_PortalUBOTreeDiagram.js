import { LightningElement, api, track } from "lwc";
import PortalAddUboDetailsModal from "c/ds_PortalAddUboDetailsModal";
import getGUID from "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getGUID";
import getNamesByIds from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getNamesByIds';
import getUboSectionsOnly
  from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getUboSectionsOnly';

export default class ds_PortalUBOTreeDiagram extends LightningElement {
    @api title = 'UBO Relationship';
    @api isViewOnly = false;
    @api objectApiName;
    @api actionTemplateId;
    @api serviceRequestId;

    @track uboRecordList = [];

    isDeleteModalOpen;
    confirmationMessage;
    originalMessage;
    showSpinner = false;
    @track deletedUboIds = [];

    @api uboSectionDetail; // used to extract field API names
    _nameCache = new Map();
    _relationships = [];
    _pendingRender = false;

    _sectionsPromise;
    _sectionsLoaded = false;
    _sectionsError;


    @api brandColor = '#008b95';

    // computed style string for the wrapper <div>
    get brandStyle() {
        return `--brand: ${this.brandColor}`;
    }
    toArray(v) { return Array.isArray(v) ? v.filter(Boolean) : (v ? [v] : []); }
    isSfId(v) { return typeof v === 'string' && /^[a-zA-Z0-9]{15,18}$/.test(v); }
    normalizeToArray(v) {
        return Array.isArray(v) ? v.filter(Boolean) : (v != null ? [v] : []);
    }


    /** Ensures this.uboSectionDetail is populated.
     *  - If parent passed it, we just mark loaded.
     *  - Else we call Apex getUboSectionsOnly(actionTempId, srId).
     */
    async ensureUboSectionsLoaded() {
    // Already provided by parent?
    if (Array.isArray(this.uboSectionDetail) && this.uboSectionDetail.length) {
        this._sectionsLoaded = true;        
        this.showSpinner = false;
        return;
    }
    // De-dupe concurrent calls
    if (this._sectionsPromise) return this._sectionsPromise;

    this.showSpinner = true;
    this._sectionsPromise = getUboSectionsOnly({
        actionTempId: this.actionTemplateId || null,
        srId: this.serviceRequestId || null
    })
    .then(res => {
        this.uboSectionDetail = Array.isArray(res) ? res : [];
        this._sectionsLoaded = true;
        this._sectionsError = null;
        
        this.showSpinner = false;
    })
    .catch(e => {
        
        this.showSpinner = false;
        this._sectionsError = e?.body?.message || e?.message || 'Failed to load UBO sections.';
        // keep uboSectionDetail as-is (may be empty)
    })
    .finally(() => {
        this.showSpinner = false;
        this._sectionsPromise = null;
    });

    return this._sectionsPromise;
    }

    // ---------- lifecycle ----------
   connectedCallback() {
    this.ensureUboListSeeded();

    // Load sections (if not provided), then backfill → render
    Promise.resolve()
        .then(() => this.ensureUboSectionsLoaded())
        .then(() => {
        this.backfillDetailsFromUboRecordList();
        this.scheduleRenderTree();
        });
    }

    renderedCallback() {
        if (this._pendingRender) {
            this._pendingRender = false;
            this.renderTree();
        }
    }

    // ---------- relationships API ----------
    @api
    get relationships() {
        return this._relationships;
    }

  set relationships(val) {
    const next = Array.isArray(val) ? val : (val ? [val] : []);
    const changed = JSON.stringify(this._relationships) !== JSON.stringify(next);
    this._relationships = next;

        if (changed) {
            this.ensureUboListSeeded();
            Promise.resolve()
            .then(() => this.ensureUboSectionsLoaded())
            .then(() => {
                this.backfillDetailsFromUboRecordList();
                this.scheduleRenderTree();
            });
        }
    }

    // ---------- render scheduling ----------
    scheduleRenderTree() {
        if (this._pendingRender) return;
        this._pendingRender = true;
        Promise.resolve().then(() => {
            const container = this.template?.querySelector('.tree-container');
            if (container && this._pendingRender) {
                this._pendingRender = false;
                this.renderTree();
            }
        });
    }

    @api
    renderTree() {
        if (this._pendingRender) return;
        const container = this.template.querySelector(".tree-container");
        if (!container) return;

        container.innerHTML = "";
        const rels = this._relationships || [];
        rels.forEach((company, idx) => {
            const node = this.createNode(company, idx);
            container.appendChild(node);
        });
    }

    // ---------- small utils ----------

    /**
 * Return a map { Id -> Name } using a small client-side cache.
 * Only fetches missing Ids from Apex: getNamesByIds(List<String> ids)
 */
    async getNamesCached(ids) {
        const out = {};
        const toFetch = [];

        // Use cache when available
        ids.forEach(id => {
            if (!id) return;
            if (this._nameCache.has(id)) {
                out[id] = this._nameCache.get(id);
            } else {
                toFetch.push(id);
            }
        });

        // Fetch the missing ones
        if (toFetch.length) {
            try {
                const fetched = await getNamesByIds({ ids: toFetch }); // <-- Apex @AuraEnabled
                if (fetched) {
                    Object.keys(fetched).forEach(id => {
                        this._nameCache.set(id, fetched[id]);
                        out[id] = fetched[id];
                    });
                }
            } catch (e) {
                // Non-fatal: leave unresolved ones out of 'out'
                // console.error(e);
            }
        }

        return out;
    }

    async buildDetailsWithLabels(rec, sectionDetails) {
        if (!rec) return {};
        const allApis = this.getFieldApiNamesFromSections(sectionDetails);
        const lookupApis = new Set(this.getLookupFieldApiNamesFromSections(sectionDetails));

        // collect only true Ids for name resolution
        const ids = [];
        lookupApis.forEach(api => {
            this.normalizeToArray(rec[api]).forEach(v => { if (this.isSfId(v)) ids.push(v); });
        });
        const id2name = ids.length ? await this.getNamesCached(ids) : {};

        const details = {};
        allApis.forEach(api => {
            const raw = rec[api];

            if (lookupApis.has(api)) {
                const vals = this.normalizeToArray(raw);
                const idVals = vals.filter(v => this.isSfId(v));

                // Persist raw ONLY if they are valid SF Ids
                if (idVals.length) details[api] = idVals.length === 1 ? idVals[0] : idVals;

                // Add labels (UI only) when resolvable
                const labels = vals.map(v => id2name[v]).filter(Boolean);
                if (labels.length) details[api + '__label'] = labels.length === 1 ? labels[0] : labels;
            } else {
                // Non-lookup: persist primitives/arrays, skip objects
                if (raw !== undefined && (typeof raw !== 'object' || Array.isArray(raw))) {
                    details[api] = raw;
                }
            }
        });

        return details;
    }


    safeText(v) {
        if (v === null || v === undefined) return '';
        return String(v);
    }

    makeLabelValue(_label, value) {
        const wrap = document.createElement("div");
        wrap.className = "slds-text-heading--label-normal";
        const p = document.createElement('p');
        p.className = 'slds-truncate';
        p.textContent = this.safeText(value);
        wrap.appendChild(p);
        return wrap;
    }

    makeAddUBOListItem(targetId, companyIndex) {
        const li = document.createElement("li");
        const addUBODiv = document.createElement("div");
        addUBODiv.className = "slds-text-align--left connector";

        const btn = document.createElement("button");
        btn.className = "slds-popover slds-button slds-button--neutral add-ubo-btn btn-ubo";
        btn.setAttribute("data-company-index", companyIndex);
        btn.textContent = "+ Add UBO";
        btn.setAttribute('aria-label', `Add UBO under ${this.safeText(targetId)}`);
        btn.addEventListener("click", () => this.handleAddUBO(targetId));

        addUBODiv.appendChild(btn);
        li.appendChild(addUBODiv);
        return li;
    }

    // ========= KEEP ORIGINAL ICON LOGIC =========
    getIcon(clickableFlag, group, type, size) {
        const iconContainer = document.createElement("span");
        iconContainer.className = `slds-icon_container `;
        const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        svg.setAttribute("class", `slds-icon slds-icon_${group}-${type} slds-icon_${size}`);
        svg.setAttribute("aria-hidden", "true");
        if (clickableFlag) svg.style.cursor = 'pointer';

        const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
        use.setAttributeNS("http://www.w3.org/1999/xlink", "xlink:href", `/_slds/icons/${group}-sprite/svg/symbols.svg#${type}`);

        svg.appendChild(use);
        iconContainer.appendChild(svg);
        return iconContainer;
    }
    // ============================================

    // ---------- schema helpers ----------
    getFieldApiNamesFromSections(sectionDetails) {
        const names = new Set();
        const walk = (node) => {
            if (!node) return;
            if (Array.isArray(node)) { node.forEach(walk); return; }
            if (node.sectionDetails && Array.isArray(node.sectionDetails)) {
                node.sectionDetails.forEach(f => {
                    const api = f?.acbox__Field_API_Name__c;
                    if (typeof api === 'string' && api.trim()) names.add(api);
                });
            }
            if (node.sections) walk(node.sections);
            if (node.fields) walk(node.fields);
        };
        walk(sectionDetails);
        return Array.from(names);
    }

    getLookupFieldApiNamesFromSections(sectionDetails) {
        const names = new Set();
        (sectionDetails || []).forEach(sec => {
            (sec.sectionDetails || []).forEach(f => {
                if ((f.acbox__Field_type__c || '').toLowerCase() === 'lookup') {
                    const api = f.acbox__Field_API_Name__c;
                    if (api) names.add(api);
                }
            });
        });
        return Array.from(names);
    }

    // ---------- details helpers ----------
    buildIdToDetailsMap() {
        const map = new Map();
        const walk = (n) => {
            if (!n) return;
            if (n.id) map.set(n.id, n.details || {});
            (n.uboList || []).forEach(walk);
        };
        (this._relationships || []).forEach(walk);
        return map;
    }

    buildDetailsFromRecord(rec, sectionDetails, displayFallbacks = {}) {
        if (!rec) return {};
        const allApis = this.getFieldApiNamesFromSections(sectionDetails);
        const lookupApis = new Set(this.getLookupFieldApiNamesFromSections(sectionDetails));
        const details = {};

        allApis.forEach(api => {
            if (!Object.prototype.hasOwnProperty.call(rec, api)) return;

            const r0 = rec[api];
            const raw = (Array.isArray(r0) && r0.length === 1) ? r0[0] : r0;

            if (lookupApis.has(api)) {
                const vals = this.normalizeToArray(raw);
                const idVals = vals.filter(v => this.isSfId(v));
                if (idVals.length) details[api] = idVals.length === 1 ? idVals[0] : idVals;

                const relKey = api.endsWith('__c') ? api.replace('__c', '__r') : api + '__r';
                const label =
                    rec[api + '__label'] ||
                    (rec[relKey] && typeof rec[relKey] === 'object' && rec[relKey].Name) ||
                    displayFallbacks[api] ||
                    rec[api + '_Name__c'] || null;
                if (label) details[api + '__label'] = label;
            } else {
                if (raw !== null && raw !== undefined && (typeof raw !== 'object' || Array.isArray(raw))) {
                    details[api] = raw;
                }
            }
        });

        return details;
    }

/* 
    buildDisplayLabelMapFromRec(rec, sectionDetails, node) {
        const map = {};
        const lookups = this.getLookupFieldApiNamesFromSections(sectionDetails);
        lookups.forEach(api => {
            map[api] =
                rec[api + '__label'] ||
                rec[api + '_Name__c'] ||
                (node && node[api.replace('__c', 'Name')]) ||
                (api === 'Country__c' ? node?.Country : undefined);
        });
        return map;
    } */

    cloneTreeWithBackfilledDetails(nodes, byId) {
        if (!Array.isArray(nodes)) return [];
        return nodes.map((node) => {
            let details = node.details;
            if (!details) {
                const rec = byId.get(node.id);
                if (rec) {
                    const displayLabels = { Country__c: node?.Country };
                    details = this.buildDetailsFromRecord(rec, this.uboSectionDetail, displayLabels);
                }
            }

            const children = Array.isArray(node.uboList)
                ? this.cloneTreeWithBackfilledDetails(node.uboList, byId)
                : undefined;

            const cloned = { ...node };
            if (details) cloned.details = details;
            if (children) cloned.uboList = children;
            return cloned;
        });
    }

    backfillDetailsFromUboRecordList() {
        if (!Array.isArray(this.uboRecordList) || this.uboRecordList.length === 0) return;

        const byId = new Map();
        this.uboRecordList.forEach(r => {
            const key = r?.External_Id__c || r?.Id || r?.id;
            if (key) byId.set(key, r);
        });

        const next = this.cloneTreeWithBackfilledDetails(this._relationships || [], byId);

        const prevStr = JSON.stringify(this._relationships || []);
        const nextStr = JSON.stringify(next);
        if (prevStr !== nextStr) {
            this._relationships = next;
            this.scheduleRenderTree?.();
        }
    }

    // ---------- DOM builders ----------
    createNode(data, companyIndex = 0) {
        const mainUl = document.createElement("ul");
        mainUl.className = "tree-branch";

        const li = document.createElement("li");
        li.className = "tree-leaf";

        const mainDiv = document.createElement("div");
        mainDiv.className = "slds-text-align--left";

        const popoverDiv = document.createElement("div");
        popoverDiv.className = "slds-popover slds-p-around--medium slds-text-align--center node-card node-card--corporate";

        const icon = this.getIcon(false, 'standard', 'account', 'large');

        const title = document.createElement("h2");
        title.className = "slds-text-heading--small slds-truncate slds-m-top--x-small";
        title.setAttribute("title", this.safeText(data.companyName));
        title.textContent = this.safeText(data.companyName);

        const typeDiv = this.makeLabelValue('Type', data.type);
        const countryDiv = this.makeLabelValue('Country', data.Country);

        const childUl = document.createElement("ul");
        childUl.className = "tree-branch";

        popoverDiv.appendChild(icon);
        popoverDiv.appendChild(title);
        popoverDiv.appendChild(typeDiv);
        popoverDiv.appendChild(countryDiv);
        mainDiv.appendChild(popoverDiv);
        li.appendChild(mainDiv);
        li.appendChild(childUl);
        mainUl.appendChild(li);

        if (!this.isViewOnly) {
            childUl.appendChild(this.makeAddUBOListItem(data.id, companyIndex));
        }

        if (data.uboList && data.uboList.length > 0) {
            const li2 = document.createElement("li");
            childUl.appendChild(li2);
            const grandChildUl = document.createElement("ul");
            grandChildUl.className = "tree-branch";
            data.uboList.forEach((ubo, uboIndex) => {
                const childNode = this.createChildNode(ubo, companyIndex, uboIndex);
                grandChildUl.appendChild(childNode);
            });
            li2.appendChild(grandChildUl);
        }
        return mainUl;
    }

    createChildNode(data, companyIndex, uboIndex) {
        const li = document.createElement("li");
        li.className = "tree-leaf";

        const span = document.createElement("span");

        const popoverDiv = document.createElement("div");
        const isCorp = (data.type || "").toLowerCase() === "corporate";
        popoverDiv.className = `slds-popover ubo-tree-leap node-card ${isCorp ? "node-card--corporate" : "node-card--individual"}`;

        const headerDiv = document.createElement("div");
        headerDiv.className = "slds-p-top--x-small slds-p-right--x-small slds-p-left--x-small";

        const subHeaderDiv = document.createElement("div");
        subHeaderDiv.className = "slds-text-align--center slds-p-top--medium leaf-header";

        const absoluteContainerDiv = document.createElement('div');
        absoluteContainerDiv.className = 'absoluteContainer';

        if (!this.isViewOnly) {
            const absoluteLeftDiv = document.createElement('div');
            absoluteLeftDiv.className = 'absoluteLeft';
            const editButton = this.getIcon(true, 'utility', 'edit', 'small');
            absoluteLeftDiv.appendChild(editButton);
            editButton.addEventListener("click", () => this.handleEditUBO(data.id));

            const absoluteRightDiv = document.createElement('div');
            absoluteRightDiv.className = 'absoluteRight';
            const deleteButton = this.getIcon(true, 'utility', 'delete', 'small');
            absoluteRightDiv.appendChild(deleteButton);
            deleteButton.addEventListener("click", () => this.handleDeleteUBO(data.id));

            absoluteContainerDiv.appendChild(absoluteLeftDiv);
            absoluteContainerDiv.appendChild(absoluteRightDiv);
        } else {
            const absoluteRightDiv = document.createElement('div');
            absoluteRightDiv.className = 'absoluteRight';
            const viewButton = this.getIcon(true, 'utility', 'preview', 'small'); // eye icon
            absoluteRightDiv.appendChild(viewButton);
            viewButton.addEventListener("click", () => this.handleViewUBO(data.id));
            absoluteContainerDiv.appendChild(absoluteRightDiv);
        }

        const icon = this.getIcon(false, 'standard', (data.type || '').toLowerCase() === "corporate" ? 'account' : 'client', 'large');
        const title = document.createElement("h3");
        title.className = "slds-p-top--x-small slds-text-heading--small";
        title.textContent = this.safeText(data.companyName);

        const typeDiv = this.makeLabelValue('Type', data.type);
        const countryDiv = this.makeLabelValue('Country', data.Country);

        subHeaderDiv.appendChild(icon);
        subHeaderDiv.appendChild(absoluteContainerDiv);
        subHeaderDiv.appendChild(title);
        subHeaderDiv.appendChild(typeDiv);
        subHeaderDiv.appendChild(countryDiv);
        headerDiv.appendChild(subHeaderDiv);
        popoverDiv.appendChild(headerDiv);

        span.appendChild(popoverDiv);
        li.appendChild(span);

        if (isCorp) {
            const childUl = document.createElement("ul");
            childUl.className = "tree-branch";
            let li2;
            if (!this.isViewOnly) {
                childUl.appendChild(this.makeAddUBOListItem(data.id, companyIndex));
                li2 = document.createElement("li");
                childUl.appendChild(li2);
                li.appendChild(childUl);
            }

            if (data.uboList && data.uboList.length > 0) {
                const ul = document.createElement("ul");
                ul.className = "tree-branch";
                data.uboList.forEach((ubo, childIndex) => {
                    const childNode = this.createChildNode(ubo, companyIndex, childIndex);
                    ul.appendChild(childNode);
                });
                if (this.isViewOnly) li.appendChild(ul); else li2.appendChild(ul);
            }
        }
        return li;
    }


    // ---------- modal handlers ----------
    async handleAddUBO(targetId) {
        await this.ensureUboSectionsLoaded();
            if (!this._sectionsLoaded || !this.uboSectionDetail?.length) {
            // Optionally surface a toast; for now just bail safely
            return;
        }

        let guidForCurrentNode = await getGUID();
        const result = await PortalAddUboDetailsModal.open({
            size: "medium",
            sectionDetails: this.uboSectionDetail,
            label: "Add UBO",
            externalId: guidForCurrentNode,
            parentExternalKey: targetId,
            serviceRequestId: this.serviceRequestId,
            actionTemplateId: this.actionTemplateId,
            objectApiName: this.objectApiName,
        });

        if (!result) return;

        let newUBO = result.ubo;
        let uboRecord = result.rec;

        if (uboRecord) {
            /* uboRecord.External_Id__c = guidForCurrentNode;
            uboRecord.OB_Amendment__r = { sobjectType: 'OB_Amendment__c', External_Id__c: targetId }; */
            uboRecord.External_Id__c = guidForCurrentNode;
        }
        if (newUBO && uboRecord?.External_Id__c) newUBO.id = uboRecord.External_Id__c;

        // capture ALL fields into node.details with labels for lookups
        if (newUBO && uboRecord) {
            if (newUBO && uboRecord) {
                newUBO.details = await this.buildDetailsWithLabels(uboRecord, this.uboSectionDetail);
            }
        }

        if (newUBO) {
            const updatedRelationships = JSON.parse(JSON.stringify(this.relationships));
            if (this.addToNestedUboList(targetId, newUBO, updatedRelationships)) {
                this.relationships = updatedRelationships;
                this.uboRecordList.push(uboRecord);
            } else {
                // eslint-disable-next-line no-console
                console.error(`ID ${targetId} not found in relationships.`);
            }
        }
    }

    async handleEditUBO(id) {
         await this.ensureUboSectionsLoaded();
            if (!this._sectionsLoaded || !this.uboSectionDetail?.length) {
            // Optionally surface a toast; for now just bail safely
            return;
        }
        const listForModal = this.getUboListForModal();

        const result = await PortalAddUboDetailsModal.open({
            size: "medium",
            sectionDetails: this.uboSectionDetail,
            label: "Edit UBO",
            externalId: id,
            uboRecordList: listForModal,
            serviceRequestId: this.serviceRequestId,
            actionTemplateId: this.actionTemplateId,
            objectApiName: this.objectApiName,
            hasExistingFile : true
        });

        if (!result) return;

        let newUBO = result.ubo;
        let uboRecord = result.rec;

        if (uboRecord) uboRecord.External_Id__c = id;
        if (newUBO && uboRecord?.External_Id__c) newUBO.id = uboRecord.External_Id__c;

        if (newUBO && uboRecord) {
            newUBO.details = await this.buildDetailsWithLabels(uboRecord, this.uboSectionDetail);

        }

        if (newUBO) {
            const updatedRelationships = JSON.parse(JSON.stringify(this.relationships));
            if (this.editUboList(id, newUBO, updatedRelationships)) {
                this.relationships = updatedRelationships;

                const idx = this.uboRecordList.findIndex(record => (record.External_Id__c || record.Id || record.id) === id);
                if (idx !== -1) {
                    this.uboRecordList[idx] = { ...this.uboRecordList[idx], ...uboRecord };
                } else {
                    this.uboRecordList.push(uboRecord);
                }
            } else {
                // eslint-disable-next-line no-console
                console.error(`ID ${id} not found in relationships.`);
            }
        }
    }

    async handleViewUBO(id) {
         await this.ensureUboSectionsLoaded();
            if (!this._sectionsLoaded || !this.uboSectionDetail?.length) {
            // Optionally surface a toast; for now just bail safely
            return;
        }
        const listForModal = this.getUboListForModal?.() || this.uboRecordList || [];
        await PortalAddUboDetailsModal.open({
            size: "medium",
            sectionDetails: this.uboSectionDetail,
            label: "View UBO",
            externalId: id,
            uboRecordList: listForModal,
            readOnly: true,
            serviceRequestId: this.serviceRequestId,
            actionTemplateId: this.actionTemplateId,
            objectApiName: this.objectApiName,
            

        });
    }

    // Make sure list passed to modal contains details if we already have them
    getUboListForModal() {
        const id2det = this.buildIdToDetailsMap();

        if (Array.isArray(this.uboRecordList) && this.uboRecordList?.length > 0) {
            const list = JSON.parse(JSON.stringify(this.uboRecordList));
            list.forEach(r => {
                const id = r?.External_Id__c || r?.Id || r?.id;
                if (id && !r.details && id2det.has(id)) {
                    r.details = id2det.get(id);
                }
            });
            return list;
        }

        const flat = [];
        const walk = (node) => {
            if (!node?.id) return;
            const rec = {
                External_Id__c: node.id,
                Name: node.companyName,
                Type__c: node.type,
                //Country__c: node.Country
            };
            const det = id2det.get(node.id);
            if (det && Object.keys(det).length) rec.details = det;
            flat.push(rec);
            (node.uboList || []).forEach(walk);
        };
        (this._relationships || []).forEach(walk);
        return flat;
    }

    // ---------- data mutators ----------
    addToNestedUboList(targetId, newUbo, relationships) {
        for (let relationship of relationships) {
            if (relationship.id === targetId) {
                if (!relationship.uboList) relationship.uboList = [];
                relationship.uboList.push(newUbo);
                return true;
            }
            if (relationship.uboList?.length > 0) {
                if (this.addToNestedUboList(targetId, newUbo, relationship.uboList)) return true;
            }
        }
        return false;
    }

    editUboList(id, newValues, relationships) {
        for (let relationship of relationships) {
            if (relationship.id === id) {
                Object.assign(relationship, {
                    companyName: newValues.companyName || relationship.companyName,
                    type: newValues.type || relationship.type,
                    Country: newValues.Country || relationship.Country
                });
                if (newValues.details) {
                    relationship.details = { ...newValues.details };
                }
                return true;
            }
            if (relationship.uboList?.length > 0) {
                if (this.editUboList(id, newValues, relationship.uboList)) return true;
            }
        }
        return false;
    }

    collectChildIds(node, deletedIds) {
        if (node.uboList && node.uboList.length > 0) {
            for (let child of node.uboList) {
                this.collectChildIds(child, deletedIds);
                deletedIds.push(child.id);
            }
        }
    }

    deleteUBOs(id, relationships = this.relationships, deletedIds = []) {
        for (let i = 0; i < relationships.length; i++) {
            if (relationships[i].id === id) {
                this.collectChildIds(relationships[i], deletedIds);
                deletedIds.push(relationships[i].id);
                relationships.splice(i, 1);
                return true;
            }
            if (Array.isArray(relationships[i].uboList) && relationships[i].uboList.length > 0) {
                const result = this.deleteUBOs(id, relationships[i].uboList, deletedIds);
                if (result) {
                    if (relationships[i].uboList.length === 0) {
                        delete relationships[i].uboList;
                    }
                    return true;
                }
            }
        }
        return false;
    }

    async handleDeleteUBO(id) {
        this.showSpinner = true;
        this.isDeleteModalOpen = true;
        this.confirmationMessage = "Are you sure? This action will remove all nested UBO records.";
        this.originalMessage = id;
        this.showSpinner = false;
    }

    async getConfirmation(event) {
        this.showSpinner = true;
        if (event.detail !== 1) {
            if (event.detail.status === "confirm") {
                let deletedIds = [];
                let id = event.detail.originalMessage;
                let updatedRelationships = JSON.parse(JSON.stringify(this.relationships));

                const found = this.deleteUBOs(id, updatedRelationships, deletedIds);
                if (found && deletedIds.length > 0) {
                    try {
                        // await apexDeleteUBORecs({ uboIds: deletedIds });
                        this.relationships = updatedRelationships;
                        this.deletedUboIds = deletedIds;
                        this.showSpinner = false;
                    } catch (error) {
                        this.showSpinner = false;
                        // eslint-disable-next-line no-console
                        console.error("Error deleting UBOs:", error);
                    }
                } else {
                    this.showSpinner = false;
                }
            } else if (event.detail.status === "cancel") {
                this.isDeleteModalOpen = false;
                this.showSpinner = false;
            }
        } else {
            this.isDeleteModalOpen = false;
            this.showSpinner = false;
        }
    }

    // ---------- seeding / flattening ----------
    ensureUboListSeeded() {
        if (!Array.isArray(this.uboRecordList)) this.uboRecordList = [];
        const existingIds = new Set(
            this.uboRecordList
                .map(r => r?.External_Id__c || r?.Id || r?.id)
                .filter(Boolean)
        );

        const id2det = this.buildIdToDetailsMap();
        const toAdd = [];

        const walk = (node) => {
            if (!node?.id) return;
            if (!existingIds.has(node.id)) {
                const rec = {
                    External_Id__c: node.id,
                    Name: node.companyName,
                    Type__c: node.type,
                    //Country__c: node.Country
                };
                const det = id2det.get(node.id);
                if (det && Object.keys(det).length) rec.details = det;
                toAdd.push(rec);
                existingIds.add(node.id);
            }
            (node.uboList || []).forEach(walk);
        };

        (this._relationships || []).forEach(walk);
        if (toAdd.length) this.uboRecordList = [...this.uboRecordList, ...toAdd];
    }

  /*   flattenRelationshipsToRecords(rels = []) {
        const flat = [];
        const walk = (node) => {
            if (!node) return;
            if (node.id) {
                flat.push({
                    External_Id__c: node.id,
                    Name: node.companyName,
                    Type__c: node.type,
                    Country__c: node.Country
                });
            }
            (node.uboList || []).forEach(walk);
        };
        (rels || []).forEach(walk);
        return flat;
    } */

    // ---------- outbound ----------
    @api
    sendDataToParent() {
        this.dispatchEvent(new CustomEvent('ubosave', {
            detail: {
                relationships: this.relationships ?? [],
                uboRecordList: this.uboRecordList ?? [],
                deletedIds: this.deletedUboIds ?? [],
                uboSectionDetail: this.uboSectionDetail?? [],
            }
        }));
    }
}
