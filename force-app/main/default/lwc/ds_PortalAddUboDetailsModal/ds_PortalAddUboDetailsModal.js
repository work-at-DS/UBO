import { api, track, wire } from 'lwc';
import LightningModal from 'lightning/modal';

import getSelectedAmendementInfo from '@salesforce/apex/ds_OnBoardPortalRequest.getSelectedAmendementInfo';
import getNamesByIds from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getNamesByIds';
import createOrUpsertUboNode from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.createOrUpsertUboNode';
import uploadAttachment from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.uploadAttachment';
import getUboSectionsOnly from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getUboSectionsOnly';

import { getRecord, getFieldValue } from 'lightning/uiRecordApi';
import COUNTRY_NAME from '@salesforce/schema/Country__c.Name';
import { refreshApex } from '@salesforce/apex';

import {
    validatePassport,
    dobValidation,
    validatePassportExpiryDate,
    pastDateValidation,
    validateVisaExpiryAgainstDuration,
    validateContractEndDateAgainstDuration,
    dateNotInPastValidation,
    digitNotNegative,
    visitVisaDurationCheck,
    restrictInsideCountry,
    validateDurationVisaExpiry,
    validateOnlyNumbers,
    validateEmiratesId
} from 'c/ds_PortalApplicationServiceUtility';

const fields = [COUNTRY_NAME];

// Controlling type field candidates (priority order)
const TYPE_FIELDS = ['Ubo_Type__c', 'Shareholder_Type__c', 'Owner_Type__c'];

export default class Ds_PortalAddUboDetailsModal extends LightningModal {
    // ---- public API ----
    @api label;
    @api sectionDetails;            // initial schema (may be superseded by server)
    @api objectApiName;             // e.g. 'OB_Amendment__c'
    @api serviceRequestId;
    @api externalId;                // node GUID (optional on create)
    @api parentExternalKey;         // parent GUID (optional)
    @api uboRecordList = [];        // existing nodes for edit prefill
    @api readOnly = false;
    @api actionTemplateId;          // for server-side section rules

    // ---- state ----
    @track obrecordId;
    @track uboSectionDetails = [];
    sObjectsRec = { sobjectType: '' };

    _spinner = false;
    get showSpinner() { return this._spinner; }
    set showSpinner(v) { this._spinner = v; }

    hasError = false;
    validationMessage = '';
    validationErrorMessage = '';

    // Attachment UI bits
    @track fileName = '';
    @track fileError = '';
    @api hasExistingFile = false;
    showAttachmentSection = false;
    _pendingFile = null;

    // show rest-of-sections only after type picked
    @track showRestSections = false;

    // lookup name cache
    _nameCache = new Map();
    lookupId; // for Country wire

    // Type field info (computed from schema)
    _typeFieldApi = null;           // 'Ubo_Type__c' | 'Shareholder_Type__c' | 'Owner_Type__c'
    @track _typeFieldMeta = null;   // meta chunk for top field
    @track typeFieldObjectApi = ''; // record-edit-form target object

    get typeFieldMeta() { return this._typeFieldMeta; }
    get typeFieldApi() { return this._typeFieldApi; }

    get helpText() { return 'Max file size: 2 MB. Allowed: PDF / JPG / JPEG.'; }
    get isRO() { return !!this.readOnly; }
    get notRO() { return !this.readOnly; }

    // dynamic validators
    dyn_functions = {
        validatePassport,
        dobValidation,
        validatePassportExpiryDate,
        pastDateValidation,
        validateVisaExpiryAgainstDuration,
        validateContractEndDateAgainstDuration,
        dateNotInPastValidation,
        digitNotNegative,
        visitVisaDurationCheck,
        restrictInsideCountry,
        validateDurationVisaExpiry,
        validateOnlyNumbers,
        validateEmiratesId
    };

    @track draftFields = {};

    // country wire (optional)
    @wire(getRecord, { recordId: '$lookupId', fields })
    wiredObjRec;

    get countryName() {
        return getFieldValue(this.wiredObjRec?.data, COUNTRY_NAME);
    }

    // ---- helpers ----
    isSalesforceId(v) {
        return typeof v === 'string' && /^[a-zA-Z0-9]{15,18}$/.test(v);
    }

    get documentText() {
        const t = (this.getUboType() || '').toLowerCase();
        return t === 'corporate' ? 'Upload License' : 'Upload Passport';
    }

    ensureSObjectTypeDefault() {
        const childObj = this.sectionDetails?.[0]?.section?.acbox__Child_Object_Name__c;
        if (!this.sObjectsRec.sobjectType && childObj) {
            this.sObjectsRec.sobjectType = childObj;
        }
    }

    ensureShareholderTypeFromList() {
        const current = this.getUboType();
        if (!current && this.sObjectsRec?.Type__c) this.setUboType(this.sObjectsRec.Type__c);
    }

    seedLookupFromRecord() {
        const c = this.sObjectsRec?.Country__c;
        if (this.isSalesforceId(c)) this.lookupId = c;
    }

    findRecordInList(id, list) {
        if (!id || !Array.isArray(list)) return null;
        return list.find(r => r?.External_Id__c === id || r?.Id === id || r?.id === id) || null;
    }

    extractDetailsObject(rec) {
        if (!rec) return {};
        if (rec.details && typeof rec.details === 'object') return rec.details;
        if (typeof rec.Details__c === 'string') {
            try { return JSON.parse(rec.Details__c) || {}; } catch (e) { }
        }
        return {};
    }

    collectLookupIdsFromSchema(sectionSchema, rec) {
        const ids = new Set();
        (sectionSchema || []).forEach(sec => {
            (sec.sectionDetails || []).forEach(f => {
                if ((f.acbox__Field_type__c || '').toLowerCase() === 'lookup') {
                    const api = f.acbox__Field_API_Name__c;
                    let v = rec?.[api];
                    if (Array.isArray(v)) v.forEach(x => { if (this.isSalesforceId(x)) ids.add(x); });
                    else if (this.isSalesforceId(v)) ids.add(v);
                }
            });
        });
        return Array.from(ids);
    }

    async getNamesCached(ids) {
        const unique = Array.from(new Set((ids || []).filter(id => this.isSalesforceId(id))));
        if (!unique.length) return {};
        const missing = unique.filter(id => !this._nameCache.has(id));
        if (missing.length) {
            try {
                const res = await getNamesByIds({ ids: missing });
                Object.entries(res || {}).forEach(([k, v]) => k && v && this._nameCache.set(k, v));
            } catch (e) { /* non-fatal */ }
        }
        const out = {};
        unique.forEach(id => { const val = this._nameCache.get(id); if (val) out[id] = val; });
        return out;
    }

    async resolveLookupLabelsOnLoad() {
        try {
            const ids = this.collectLookupIdsFromSchema(this.uboSectionDetails, this.sObjectsRec);
            if (!ids.length) return;
            const nameMap = await this.getNamesCached(ids);
            (this.uboSectionDetails || []).forEach(sec => {
                (sec.sectionDetails || []).forEach(f => {
                    if ((f.acbox__Field_type__c || '').toLowerCase() === 'lookup') {
                        const api = f.acbox__Field_API_Name__c;
                        let raw = this.sObjectsRec?.[api];
                        if (Array.isArray(raw) && raw.length === 1) raw = raw[0];
                        const label = nameMap?.[raw];
                        if (label) {
                            this.sObjectsRec[api + '__label'] = label;
                            if (this.readOnly) {
                                f.acbox__Default_Value__c = label;
                                f.isRenderByDefault = true;
                            }
                        }
                    }
                });
            });
        } catch (e) { /* ignore */ }
    }

    applyReadOnlyToSchema(sectionSchema) {
        (sectionSchema || []).forEach(sec => {
            (sec.sectionDetails || []).forEach(f => {
                f.isOutput = true;
                f.readOnly = true;
                f.disabled = true;
                f.acbox__Is_Read_Only__c = true;
            });
        });
    }

    determineTypeFieldApiFromSchema(sections) {
        const present = new Set();
        (sections || []).forEach(sec => (sec.sectionDetails || []).forEach(f => {
            if (f?.acbox__Field_API_Name__c) present.add(f.acbox__Field_API_Name__c);
        }));

        let chosen = TYPE_FIELDS.find(api => present.has(api)) || null;

        // fallback: first field in the first section
        if (!chosen && sections?.length && sections[0].sectionDetails?.length) {
            chosen = sections[0].sectionDetails[0].acbox__Field_API_Name__c;
        }
        this._typeFieldApi = chosen || 'Shareholder_Type__c';

        // cache meta + owning object api and mark _isTypeField
        this._typeFieldMeta = null;
        this.typeFieldObjectApi = '';
        (sections || []).forEach(sec => {
            (sec.sectionDetails || []).forEach(f => {
                const api = f.acbox__Field_API_Name__c;
                f._isTypeField = (api === this._typeFieldApi);
                if (f._isTypeField) {
                    this._typeFieldMeta = f;
                    this.typeFieldObjectApi = sec?.section?.acbox__Child_Object_Name__c || this.objectApiName;
                }
            });
        });
    }

    // ---- lifecycle ----
    async connectedCallback() {
        // 1) Load or pre-create the draft record
        if (this.externalId) {
            // EDIT
            const existing = this.findRecordInList(this.externalId, this.uboRecordList);
            if (existing) {
                const details = this.extractDetailsObject(existing);
                this.sObjectsRec = { ...existing, ...details };
                if (existing.Id) this.obrecordId = existing.Id;
                this.ensureSObjectTypeDefault();
                this.ensureShareholderTypeFromList();
                this.seedLookupFromRecord();
            } else {
                try {
                    const rows = await getSelectedAmendementInfo({ relationId: this.externalId });
                    if (rows && rows.length) {
                        this.obrecordId = rows[0].Id;
                        this.sObjectsRec = rows[0];
                        this.ensureSObjectTypeDefault();
                        this.ensureShareholderTypeFromList();
                        this.seedLookupFromRecord();
                    }
                } catch (e) { /* ignore */ }
            }
        } else {
            // NEW: create a Draft node so server rules & uploads work
            this.ensureSObjectTypeDefault();
            try {
                const inputJson = JSON.stringify({
                    externalKey: this.externalId,
                    parentExternalKey: this.parentExternalKey,
                    status: 'Draft',
                    fields: {},
                    serviceRequestId: this.serviceRequestId
                });
                const draft = await createOrUpsertUboNode({ inputJson, objectApiName: this.objectApiName });
                if (draft?.Id) this.obrecordId = draft.Id;
            } catch (e) { /* ignore */ }
        }

        // 2) Pull filtered sections (server rules)
        await this.refreshSectionsFromServer();

        // 3) Resolve lookup labels for RO display / UX
        await this.resolveLookupLabelsOnLoad();

        // 4) Apply RO UI if needed
        if (this.readOnly) this.applyReadOnlyToSchema(this.uboSectionDetails);

        // 5) Bind to template (for any code that still looks at sectionDetails)
        this.sectionDetails = this.uboSectionDetails;

        // 6) If type already chosen, show rest and filter accordingly (without clearing values)
        const t = this.getUboType();
        this.showRestSections = !!t;
        if (t) this.filterSectionsByUboType(t);
    }

    // ---- input handlers ----
    async handleToggleChange(event) {
        if (this.isRO) return;
        const inputJSFunction = event.detail.onChangeJS;
        const errorMsg = event.detail.customError || 'Please enter Valid Data';
        const result = inputJSFunction ? await this.dyn_functions[inputJSFunction](event.detail.value, this.sObjectsRec) : true;
        if (!result) {
            this.processValidationDetails(event.detail.fieldapi, true, errorMsg, event.detail.value);
            return;
        }
        this.sObjectsRec[event.detail.fieldapi] = event.detail.value;
    }

    async handleInputValues(event) {
        if (this.isRO) return;

        let fieldValue = (event.detail && event.detail.value !== undefined)
            ? event.detail.value
            : event.target.value;

        const {
            targetId: fieldAPIName,
            targetType,
            targetRegex: inputregex,
            targetChangejsfunction: inputJSFunction,
            targetErrormessage: errorMessage = 'Please enter valid data.',
            targetSr
        } = event.target.dataset;

        if (fieldValue === null || fieldValue === '') return;

        const fieldTypeLower = String(targetType || '').toLowerCase();

        // ----- TYPE FIELD -----
        if (fieldAPIName === this.getUboTypeFieldName()) {
            this.sObjectsRec[fieldAPIName] = fieldValue;
            this.showRestSections = true;
            this.showAttachmentSection = true;

            await this.persistAndRebuildSectionsIfNeeded(fieldAPIName);

            // Filter newly returned sections without clearing captured values
            this.filterSectionsByUboType(fieldValue);
            this.processValidationDetails(fieldAPIName, false, '', fieldValue);
            return;
        }

        // ----- UI toggles -----
        // Have_you_visited_the_UAE_before__c → show Are_you_resident_in_the_UAE__c ; always hide/reset Emirates_ID__c (UI only)
        if (fieldAPIName === 'Have_you_visited_the_UAE_before__c') {
            const yes = String(fieldValue).toLowerCase() === 'yes' || fieldValue === true;
            this.toggleFields(['Are_you_resident_in_the_UAE__c'], yes);
            this.toggleFields(['Emirates_ID__c'], false);
        }

        // Emirates_ID__c → format 784-XXXX-XXXXXXX-X
        if (fieldAPIName === 'Emirates_ID__c') {
            fieldValue = this.formatEmiratesId(fieldValue);
            try { event.target.value = fieldValue; } catch (e) { /* ignore */ }
        }

        // Exception_Company_Type__c → toggle stock/govt name
        if (fieldAPIName === 'Exception_Company_Type__c') {
            const s = String(fieldValue || '').toLowerCase();
            const showStock = s.includes('listed');
            const showGovt = s.includes('government');
            this.toggleFields(['Stock_Exchange_Government_Entity_Name__c'], showGovt || showStock);
        }

        // Type_of_Politically_Exposed_Person__c → toggle PEP_Other__c on "Other"
        if (fieldAPIName === 'Type_of_Politically_Exposed_Person__c') {
            const showOther = String(fieldValue || '').toLowerCase() === 'other';
            this.toggleFields(['PEP_Other__c'], showOther);
        }

        // ----- Validations (regex + custom JS) -----
        if (
            (inputregex && inputregex !== '' && !new RegExp(inputregex, 'g').test(fieldValue)) ||
            (inputJSFunction && this.dyn_functions.hasOwnProperty(inputJSFunction))
        ) {
            let result = inputJSFunction
                ? await this.dyn_functions[inputJSFunction](fieldValue, this.sObjectsRec)
                : false;

            if (!result && typeof result === 'boolean') {
                this.processValidationDetails(fieldAPIName, true, errorMessage, fieldValue);
                return;
            } else if (result && typeof result === 'string') {
                this.processValidationDetails(fieldAPIName, true, result, fieldValue);
                return;
            } else if (result && typeof result === 'object') {
                if (result.clearValue === true) { event.target.value = ''; fieldValue = ''; }
                else if (typeof result.clearValue === 'string') { event.target.value = result.clearValue; fieldValue = result.clearValue; }
                this.processValidationDetails(fieldAPIName, true, result.errMsg, fieldValue);
                return;
            }
        }

        // ----- Lookup labels (authoritative & immediate) -----
        if (fieldTypeLower === 'lookup') {
            // normalize ["a0K.."] -> "a0K.."
            if (Array.isArray(fieldValue) && fieldValue.length === 1 && typeof fieldValue[0] === 'string') {
                fieldValue = fieldValue[0];
            }

            this.showSpinner = true;

            // If component gave a display label, accept only if it doesn't look like an Id
            const maybeLabels =
                event.detail?.displayValue ??
                event.detail?.displayValues ??
                event.detail?.labels ??
                event.target?.displayValue ?? null;

            if (maybeLabels) {
                const asText = Array.isArray(maybeLabels) ? maybeLabels.filter(Boolean).join(', ') : maybeLabels;
                if (asText && !this.isSalesforceId(asText)) {
                    this.sObjectsRec[fieldAPIName + '__label'] = asText;
                }
            }

            // Resolve names via Apex for the selected Id(s)
            try {
                const ids = Array.isArray(fieldValue) ? fieldValue : [fieldValue];
                const map = await this.getNamesCached(ids);
                const names = ids.map(id => map[id]).filter(Boolean);
                if (names.length) {
                    this.sObjectsRec[fieldAPIName + '__label'] = names.join(', ');
                }
            } catch (e) { /* ignore */ }

            // keep Country wire happy (for Country__c)
            this.lookupId = Array.isArray(fieldValue) ? fieldValue[0] : fieldValue;
            try { await refreshApex(this.wiredObjRec); } catch (e) { /* ignore */ }

            this.showSpinner = false;
        } else {
            // ----- Normalization (don’t upper-case non-text types) -----
            const nonUpper = new Set([
                'picklist', 'multi picklist', 'radio', 'checkbox', 'time',
                'date', 'datetime', 'integer', 'double', 'number', 'currency', 'percent',
                'phone', 'lookup', 'email', 'url', 'textarea'
            ]);

            if (!nonUpper.has(fieldTypeLower)) {
                fieldValue = String(fieldValue).toUpperCase();
            }
        }

        // Capture value
        this.sObjectsRec = { ...this.sObjectsRec, [fieldAPIName]: fieldValue };
        this.processValidationDetails(fieldAPIName, false, '', fieldValue);

        // Start showing attachments once any non-type field changes
        if (!this.showAttachmentSection) this.showAttachmentSection = true;

        // Persist & rebuild if field has change-effects server-side
        await this.persistAndRebuildSectionsIfNeeded(fieldAPIName);

        // Re-apply local type filter (preserves values)
        const currentType = this.getUboType();
        if (currentType) this.filterSectionsByUboType(currentType);
    }

    processFields(fields, isRenderByDefault) {
        fields.forEach(field => {
            field.isRenderByDefault = isRenderByDefault;
            if (!isRenderByDefault) {
                // UI only: clear default display; DO NOT clear sObjectsRec (preserve user input)
                field.acbox__Default_Value__c = '';
            }
        });
    }

    // Client-side filter for sections based on selected type (no value clearing)
    processSections(fieldAPIName, fieldValue) {
        if (fieldAPIName !== this.getUboTypeFieldName()) return;
        this.filterSectionsByUboType(fieldValue);
    }

    processValidationDetails(field, hasError, errorMessage, fieldValue) {
        for (let i = 0; i < (this.uboSectionDetails || []).length; i++) {
            for (let j = 0; j < (this.uboSectionDetails[i].sectionDetails || []).length; j++) {
                if (field === this.uboSectionDetails[i].sectionDetails[j].acbox__Field_API_Name__c) {
                    this.uboSectionDetails[i].sectionDetails[j].acbox__Default_Value__c = fieldValue;
                    this.uboSectionDetails[i].sectionDetails[j].hasError = hasError;
                    this.uboSectionDetails[i].sectionDetails[j].errorMessage = errorMessage;
                }
            }
        }
    }

    // ---- actions ----
    handleDismiss() { this.close(); }

    showToast(type, message) {
        let icon;
        if (type === 'error') icon = 'utility:error';
        else if (type === 'success') icon = 'utility:success';
        else if (type === 'warning') icon = 'utility:warning';
        else icon = 'utility:info';

        const host = this.template.querySelector('c-ds_-portal-toast-lwc');
        if (host && host.showToast) host.showToast(type, message, icon, 5000);
    }

    validateFields() {
        return [...this.template.querySelectorAll('lightning-input-field')]
            .reduce((ok, f) => ok && f.reportValidity(), true);
    }

    validateInputFields() {
        return [...this.template.querySelectorAll('lightning-input')]
            .reduce((ok, f) => ok && f.reportValidity(), true);
    }

    computeCountryNameForSave() {
        return this.countryName
            || this.sObjectsRec?.Country__r?.Name
            || this.sObjectsRec?.Country_Name__c
            || this.sObjectsRec?.Country__c
            || '';
    }

    // Presentation country: mirrors original label-first logic, both corp/individual
    getDisplayCountry(isCorp) {
        const corp =
            this.sObjectsRec.Place_of_Registration__c__label ||
            this.sObjectsRec.Place_of_Registration__c_Name__c ||
            this.computeCountryNameForSave();

        const indiv =
            this.computeCountryNameForSave() ||
            this.sObjectsRec.Passport_Issuing_Country__c__label ||
            this.sObjectsRec.Nationality__c__label ||
            this.sObjectsRec.Nationality__c;

        return ((isCorp ? corp : indiv) || '').toString().trim();
    }

    buildFieldMapFromSchema() {
        const out = {};
        const lookupApis = new Set(
            (this.uboSectionDetails || []).flatMap(sec =>
                (sec.sectionDetails || [])
                    .filter(f => (f.acbox__Field_type__c || '').toLowerCase() === 'lookup')
                    .map(f => f.acbox__Field_API_Name__c)
            )
        );

        (this.uboSectionDetails || []).forEach(sec => {
            (sec.sectionDetails || []).forEach(f => {
                const api = f?.acbox__Field_API_Name__c;
                if (!api || api.endsWith('__label')) return;

                if (!Object.prototype.hasOwnProperty.call(this.sObjectsRec, api)) return;

                let v = this.sObjectsRec[api];
                if (Array.isArray(v) && v.length === 1) v = v[0];

                if (lookupApis.has(api)) {
                    if (typeof v === 'string' && /^[a-zA-Z0-9]{15,18}$/.test(v)) {
                        out[api] = v;
                    }
                } else {
                    if (v !== undefined && (typeof v !== 'object' || Array.isArray(v))) {
                        out[api] = v;
                    }
                }
            });
        });

        return out;
    }

    async handleSave() {
        if (this.isRO) { this.close(); return; }
        this.showSpinner = true;

        // Attachment required?
        if (!this.hasExistingFile && !this._pendingFile) {
            this.fileError = 'Please upload a file (PDF or JPG).';
            if (this.showRestSections) this.showAttachmentSection = true;
            this.showToast('error', 'Attachment is required.');
            this.showSpinner = false;
            return;
        }

        // Validate UI fields
        this.template.querySelectorAll('lightning-input-field').forEach(el => el.reportValidity());
        const isValid = this.validateFields();
        const isInputFieldValid = this.validateInputFields();

        if (!isValid || !isInputFieldValid) {
            this.showToast('error', 'Please correct errors.');
            this.showSpinner = false;
            return;
        }

        // Build display values
        const typeApi = this.getUboTypeFieldName();
        const selectedType = (this.sObjectsRec[typeApi] || '').trim();
        const isCorp = (selectedType || '').toLowerCase() === 'corporate';

        const fullName = [this.sObjectsRec.First_Name__c, this.sObjectsRec.Middle_Name__c, this.sObjectsRec.Last_Name__c]
            .map(v => (v || '').trim()).filter(Boolean).join(' ');

        const displayName = (isCorp ? this.sObjectsRec.Company_Name__c : fullName || '').trim();
        const displayCountry = this.getDisplayCountry(isCorp);

        // Prefer the GUID we already passed in as externalId
        const nodeId = (this.externalId && this.externalId.trim()) || (selectedType + Date.now());

        const newUBO = {
            id: nodeId,
            companyName: displayName,
            type: selectedType,
            Country: displayCountry,
            uboList: []
        };

        try {
            const fieldMap = this.buildFieldMapFromSchema();
            const inputJson = JSON.stringify({
                externalKey: (this.externalId || '').trim(),
                parentExternalKey: (this.parentExternalKey || '').trim(),
                status: 'Draft',
                fields: fieldMap,
                serviceRequestId: this.serviceRequestId
            });

            const saved = await createOrUpsertUboNode({ inputJson, objectApiName: this.objectApiName });
            if (saved?.Id) this.obrecordId = saved.Id;

            if (this._pendingFile && this.obrecordId) {
                try {
                    await uploadAttachment({
                        parentId: this.obrecordId,
                        fileName: this._pendingFile.fileName,
                        base64Data: this._pendingFile.base64
                    });
                    this._pendingFile = null;
                } catch (e) {
                    this.showToast('warning', 'Record saved, but file upload failed. Please try again.');
                }
            }
        } catch (e) {
            this.showToast('error', 'Save failed. Please try again.');
            this.showSpinner = false;
            return;
        }

        this.showSpinner = false;
        this.close({ ubo: newUBO, rec: { ...this.sObjectsRec, Id: this.obrecordId, External_Id__c: this.externalId } });
    }

    // ---- file upload ----
    async handleUploadFinished(event) {
        this.showSpinner = true;
        try {
            const file = event.target?.files?.[0];
            if (!file) return;

            this.fileName = file.name;
            const MAX = 2 * 1024 * 1024;
            if (file.size > MAX) {
                this._pendingFile = null;
                event.target.value = null;
                this.fileError = 'File too large. Max 2 MB allowed.';
                this.showToast('error', this.fileError);
                this.showSpinner = false;
                return;
            }

            const ext = (file.name.split('.').pop() || '').toLowerCase();
            const ok = ['pdf', 'jpg', 'jpeg'];
            if (!ok.includes(ext)) {
                this._pendingFile = null;
                event.target.value = null;
                this.fileError = 'Invalid file type. Only PDF/JPG/JPEG allowed.';
                this.showToast('error', this.fileError);
                this.showSpinner = false;
                return;
            }

            const base64 = await new Promise((resolve, reject) => {
                const r = new FileReader();
                r.onload = () => {
                    const res = r.result || '';
                    const i = res.indexOf(',');
                    resolve(i >= 0 ? res.slice(i + 1) : res);
                };
                r.onerror = reject;
                r.readAsDataURL(file);
            });

            this._pendingFile = { fileName: file.name, base64, size: file.size, type: file.type };
            this.fileError = '';
            this.showToast('success', 'File ready. It will be attached on Save.');
        } catch (e) {
            this._pendingFile = null;
            this.fileError = 'Could not read file. Please try again.';
            this.showToast('error', this.fileError);
        } finally {
            this.showSpinner = false;
        }
    }

    // ---- metadata helpers / server refresh ----
    findFieldMeta(api) {
        for (const sec of this.uboSectionDetails || []) {
            for (const f of sec.sectionDetails || []) {
                if (f.acbox__Field_API_Name__c === api) return f;
            }
        }
        return null;
    }

    async saveDraftNode(partial = {}) {
        const fieldMap = this.buildFieldMapFromSchema();
        Object.assign(fieldMap, partial);

        const inputJson = JSON.stringify({
            externalKey: (this.externalId || '').trim(),
            parentExternalKey: (this.parentExternalKey || '').trim(),
            status: 'Draft',
            fields: fieldMap,
            serviceRequestId: this.serviceRequestId
        });

        const saved = await createOrUpsertUboNode({ inputJson, objectApiName: this.objectApiName });
        if (saved?.Id) this.obrecordId = saved.Id;
    }

    _refreshing = false;

    async refreshSectionsFromServer() {
        if (!this.actionTemplateId || this._refreshing) return;
        this._refreshing = true;

        this.showSpinner = true;
        try {
            const srv = await getUboSectionsOnly({
                actionTempId: this.actionTemplateId,
                srId: this.serviceRequestId
            });

            // Replace local schema with server-evaluated one
            this.uboSectionDetails = JSON.parse(JSON.stringify(srv || []));

            // Decide which field is the TYPE field and flag it
            this.determineTypeFieldApiFromSchema(this.uboSectionDetails);

            // Re-hydrate values into the new schema + mark renderables
            for (const sec of this.uboSectionDetails) {
                (sec.sectionDetails || []).forEach(f => {
                    const api = f.acbox__Field_API_Name__c;
                    if (!api) return;
                    const isLookup = (f.acbox__Field_type__c || '').toLowerCase() === 'lookup';
                    let val = this.sObjectsRec?.[this.readOnly && isLookup ? (api + '__label') : api];
                    if (this.readOnly && Array.isArray(val)) val = val.join(', ');
                    if (val !== undefined && val !== null && val !== '') {
                        f.acbox__Default_Value__c = val;
                        f.isRenderByDefault = true;
                    }
                });
            }

            if (this.readOnly) this.applyReadOnlyToSchema(this.uboSectionDetails);

            // Keep sectionDetails in sync for any external usage
            this.sectionDetails = this.uboSectionDetails;
        } finally {
            this.showSpinner = false;
            this._refreshing = false;
        }
    }

    async persistAndRebuildSectionsIfNeeded(changedApi) {
        const meta = this.findFieldMeta(changedApi);
        if (!meta?.acbox__Has_On_Change__c) return;
        await this.saveDraftNode({ [changedApi]: this.sObjectsRec[changedApi] });
        await this.refreshSectionsFromServer();
    }

    getUboTypeFieldName() {
        if (this._typeFieldApi) return this._typeFieldApi;
        this.determineTypeFieldApiFromSchema(this.uboSectionDetails || []);
        return this._typeFieldApi || 'Shareholder_Type__c';
    }

    getUboType() {
        const k = this.getUboTypeFieldName();
        return this.sObjectsRec?.[k] || '';
    }

    setUboType(val) {
        const k = this.getUboTypeFieldName();
        this.sObjectsRec = { ...(this.sObjectsRec || {}), [k]: val };
    }

    normalizeTypeLabel(t) {
        if (!t) return null;
        const s = String(t).toLowerCase().trim();
        if (s.startsWith('indiv')) return 'individual';
        if (s.startsWith('corp')) return 'corporate';
        if (s.startsWith('govern') || s.includes('stock')) return 'government';
        return null;
    }

    // Show/hide sections by selected UBO type; do NOT clear sObjectsRec values when hiding
    filterSectionsByUboType(selectedVal) {
        const selected = this.normalizeTypeLabel(selectedVal);
        const typeApi = this.getUboTypeFieldName();

        (this.uboSectionDetails || []).forEach(sec => {
            const tag = (sec.section?.acbox__Type__c || '').toLowerCase().trim();
            const hasTypeFieldHere = (sec.sectionDetails || []).some(
                f => f.acbox__Field_API_Name__c === typeApi
            );

            // Keep the section that contains the type field (and any 'UBOType' block) visible
            if (hasTypeFieldHere || tag === 'ubotype') {
                sec.section.isRenderByDefault = true;
                (sec.sectionDetails || []).forEach(f => { f.isRenderByDefault = true; });
                return;
            }

            const shouldShow =
                !tag ||
                (selected === 'individual' && tag.includes('individual')) ||
                (selected === 'corporate' && tag.includes('corporate')) ||
                (selected === 'government' && (tag.includes('government') || tag.includes('stock')));

            sec.section.isRenderByDefault = !!shouldShow;
            (sec.sectionDetails || []).forEach(f => {
                f.isRenderByDefault = !!shouldShow;
                if (!shouldShow) {
                    // UI only: clear default value to hide; keep captured value in sObjectsRec
                    f.acbox__Default_Value__c = '';
                }
            });
        });
    }

    // Show/hide specific fields by API (UI only; preserve sObjectsRec)
    toggleFields(apiList, show) {
        (this.uboSectionDetails || []).forEach(sec => {
            (sec.sectionDetails || []).forEach(f => {
                if (apiList.includes(f.acbox__Field_API_Name__c)) {
                    f.isRenderByDefault = !!show;
                    if (!show) {
                        f.acbox__Default_Value__c = '';
                    }
                }
            });
        });
    }

    // Emirates ID prettifier → 784-XXXX-XXXXXXX-X
    formatEmiratesId(raw) {
        const digits = String(raw || '').replace(/\D/g, '').slice(0, 15); // 15 digits max
        const parts = [];
        parts.push(digits.slice(0, 3));
        if (digits.length > 3) parts.push(digits.slice(3, 7));
        if (digits.length > 7) parts.push(digits.slice(7, 14));
        if (digits.length > 14) parts.push(digits.slice(14, 15));
        return parts.filter(Boolean).join('-');
    }
}
