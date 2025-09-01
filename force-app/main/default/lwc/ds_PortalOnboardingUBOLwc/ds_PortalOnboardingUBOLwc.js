import { LightningElement, track, api, wire } from "lwc";
import { deleteRecord  } from "lightning/uiRecordApi";
import getApplicationDetails from "@salesforce/apex/ds_PortalApplicationService.getFormDetailsCopy";
import apexCreateServiceRequest from "@salesforce/apex/ds_lex_PortalRequestController.createServiceRequest";
import apexDeleteRecordServiceRequest from "@salesforce/apex/ds_PortalApplicationService.apexDeleteRecordServiceRequest";
import { generateLink, redirectToApplication } from "c/ds_PortalUtility";
import { getPicklistValues } from "lightning/uiObjectInfoApi";
import { getObjectInfo } from 'lightning/uiObjectInfoApi';
import createsObjectRecord from "@salesforce/apex/ds_OnBoardPortalRequest.createsObjectRecord";
import updatesObjectRecord from "@salesforce/apex/ds_OnBoardPortalRequest.updatesObjectRecord";
import updateAmendmentRecord from "@salesforce/apex/ds_OnBoardPortalRequest.updateAmendmentRecord";
import getNextPageflowDetails from "@salesforce/apex/ds_OnBoardPortalRequest.getNextPageflowDetails";
import getPreviousPageflowDetails from "@salesforce/apex/ds_OnBoardPortalRequest.getPreviousPageflowDetails";
import { createRecord } from 'lightning/uiRecordApi';
import getExistingShareHoldersData from '@salesforce/apex/ds_OnBoardPortalRequest.getExistingShareHoldersData';
import duplicateRecordCheck from '@salesforce/apex/ds_OnBoardPortalRequest.duplicateAmendmentRecordCheck';
import getExistingAndNewAmmendmentRecordsWithRole from '@salesforce/apex/ds_OnBoardPortalRequest.getExistingAndNewAmmendmentRecordsWithRole';
import getSelectedAmendementInfo from '@salesforce/apex/ds_OnBoardPortalRequest.getSelectedAmendementInfo';
import createAmendmentforDiretor from '@salesforce/apex/ds_OnBoardPortalRequest.createAmendmentforDiretor';
import deleteRelatedDocuments from '@salesforce/apex/ds_OnBoardPortalRequest.deleteRelatedDocuments';
import deleteUploadedFiles from '@salesforce/apex/ds_OnBoardPortalRequest.deleteUploadedFiles';
import getRelatedRecords from '@salesforce/apex/ds_OnBoardPortalRequest.getRelatedRecords';
import getSelectedRelationInfo from '@salesforce/apex/ds_OnBoardPortalRequest.getSelectedRelationInfo';
import getDocumentOCR from '@salesforce/apex/ds_OnBoardPortalRequest.getDocumentOCR';
import createReqDocuments from '@salesforce/apex/ds_OnBoardPortalRequest.createReqDocuments';
import createReqFee from '@salesforce/apex/ds_OnBoardPortalRequest.createReqFee';
import getAccountDetails from "@salesforce/apex/ds_OnBoardPortalRequest.getAccountDetails";
import checkCorporateUBO from "@salesforce/apex/ds_OnBoardPortalRequest.checkCorporateUBO";
import checkCorporateUBOMotherCompany from "@salesforce/apex/ds_OnBoardPortalRequest.checkCorporateUBOMotherCompany";
import OB_AMENDMENT from "@salesforce/schema/OB_Amendment__c";
import OB_REQUEST from "@salesforce/schema/OB_Amendment__c.Onboard_Request__c";
import LA_OBJECT from '@salesforce/schema/OB_Amendment__c';
import OWNER_TYPE from "@salesforce/schema/OB_Amendment__c.Owner_Type__c";
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
} from "c/ds_PortalApplicationServiceUtility";
import {
  updateRecord,
  notifyRecordUpdateAvailable
} from "lightning/uiRecordApi";
const existingDirectorDataColumns =[
  { label: 'Name', fieldName: 'Name', type: 'text' },
  { label: 'Passport Number', fieldName: 'PassportNumber', type: 'text' },
  { label: 'Role', fieldName: 'Role', type: 'text' },
  {
    label: 'Action',
    type: 'button-icon',
    typeAttributes: {
      iconName: 'utility:delete',
      iconClass:'slds-icon-text-error',
      name: 'delete_details',
      title: 'Delete',
    }
  },
]
export default class Ds_PortalOnboardingUBOLwc extends LightningElement {
  @track obrecordId;
  get acceptedFormats() {
    return ['.pdf', '.png'];
  }
  existingDirectorDataColumns =existingDirectorDataColumns;
  shareHoldersData = [];
  uboData = [];
  directorsData = [];
  membersData = [];
  uboMembersData = [];
  shareHolderCorporatemembersData = [];
  shareHolderMembersData = [];
  selectedMemberList = [];
  selectedMembers = [];
  activeDirectorListfromAccount=[];
  removedDirectorList =[];
  ammListTemp=[];
  directorsListTemp=[];
  shareholdersListTemp=[];
  managerListTemp=[];
  secretaryListTemp=[];
  legalRepListTemp=[];
  uboListTemp=[];
  uboListIndividual = [];
  uboListIndividualandCorporate = [];
  uboListGovenment = [];
  relatedDataColumns = [];
  requiredActionsHeader = [];
  sharedHoldersColumns = [];
  isAmendmentCreated = false;
  isUBOTypeSelected = false;
  requestActions = [];
  amendmentRequestAction = [];
  delRecordId="";
  relAccountId = "";
  relId = "";
  @track showChoosefromPeople=true;
  @track showChoosefromExisting = true;
  @track isDialogVisible=false;
  @track isDialogVisibleGen=false;
  @track confirmationMessage;
  @track confirmationMessageGen;
  @track noActiveAmmendment =false;
  @track isModalOpen = false;
  showShareHoldersForm = false;
  @track isAmendmentModalOpen = false;
  @track isPersonAccountModalOpen = false;
  uboOwnershipPercentage = 0;
  uboPercentage = 0;
  accId='';
  isShareholderSel = true;
  isUpdateForm = false;
  shareholderType = '';
  hasError = false;
  validationMessage = '';
  validationErrorMessage = '';
  showexistingDirectors =false;
  skipDocUpload = false;
  isUBOForm = false;
  @track formTemplatUniqueCode;
  @api actionTempId = "";
  @track sectionDetails;
  @track sectionDetailsChild = [];
  @track parentObjectFieldName = [];
  @track existingData = [];
  childObjectName = "";
  @api listChild = [];
  @api childObjectInstance;
  @track formRows = [];
  @track sObjects = { sobjectType: "" };
  fieldsGroupBy = {};
  countryCodes = {};
  _spinner = false;
  isExpand = false;
  @api serviceRequestId = "";
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
  dependentPickListValues = {};
  stopNavigation = false;
  IndividualDescription = 'List of all Beneficial Owners (BO) who are natural persons as per the BO Resolution, please complete the following details: Name, Nationality, Passport No, Date of Birth, Gender, UAE ID #, Address, Contact Number, Status of BO ownership/control.';
  corporateDescription = 'Applies if the shareholders are not natural person: Attach the Company ownership Structure and details of the Legal Person. (Company Name, Registration Address and No, Date of Incorporation, and Place of Registration.)';
  exceptionDescription = 'Where the entity has any Beneficial Owners that are designated as Exempt Entity (Listed in Stock Market/ Government Entity) please complete the following details: Company Type, Company Name, Registration Address and No, Reason for Exemption, Date of Incorporation, and Place of Registration.';
  @api isreviewflag = false;
  srRecordTypeId = "";
  @api currentFlowId = "";
  @api isReadOnly = false;
  @api reqObjectName;
  @api updateRequest = false;
  @api isReqGenerated;
  @api buttonlabel;
  @track isChecked = false;
  NoOfShares = '';
  DACCAccount = '';
  @track isDACCRegistered = false;
  @track isNotDACCRegistered = true;
  @track hideDACCDropdown = false;
  @track isShareHolderPage = false;
  existingDirectors ='Existing Director List';
  removedDirectors ='Removed Director List';
  showRemovedDirectorsList=false;
  TOGGLE_TEXT_PICKLIST = "Toggle Picklist";
  TOGGLE_TEXT_CHKBX = "Toggle Checkbox";
  RADIO_GROUP_PICKLIST = "Radio";
  menutext;
  TRUE_TEXT = "true";
  PICKLIST_TEXT = "Picklist";
  MULTIPICKLIST_TEXT = "Multi Picklist";
  RADIO_TEXT = "Radio";
  CHECKBOX_TEXT = "Checkbox";
  hasChangeFieldName = "";
  loadCustomCmp = true;
  dirtyFlag = false;
  serviceReq = [];
  wiredResult;
  @track formName;
  formHeader = 'Add Shareholder Details';
  @api groupName = 'Select shareholder type';
  @api groupLabel = 'Please Select the type of Shareholder';
  @track formRole;
  shareHolderSelectedValue;
  updateSectionSelectedValue = [];
  picklistOptions = [];
  rolePicklistOptions = [];
  uploadedFileName;
  contentVersionId = '';
  dataTableName = '';
  relationsdataTableName = '';
  relatedRecords = [];
  existingRecords = [];
  relatedRecordsAll = [];
  relatedRelRecords = [];
  documentURL = '';
  documentName = '';
  showPersonalInfo=false;
  showUBOTypeSection = false;
  showPPSpinner = false;
  showSpinner1 = false;
  showRegisteredActivities = false;
  addRegisteredActivities = 'Registered Activities';
  registeredActivities = [];
  serviceRequestRecord='';
  helpText = `Please upload a clear, coloured scan of Applicant’s passport pages displaying personal details. Please ensure that your passport is valid for atleast 
                            six months from the date of submission. The maximum file size allowed is 2mb and accepted file formats are ".pdf,.jpeg,.jpg".`;
  documentText = 'Upload a Passport Copy';
  showHelp= false;
  duplicatecheck = false;
  @track addBtnlabel = 'Add UBO';
  entityType = '';
  addBoardMemberMetadata = [];
  fieldsRenderByRule = ['PEP_Other__c','Stock_Exchange_Government_Entity_Name__c','Are_you_resident_in_the_UAE__c','In_Out__c','Emirates_ID__c','Type_of_Politically_Exposed_Person__c','Secondary_Passport_Expiry_Date__c','Secondary_Passport_Issue_Date__c','Secondary_Passport_Issuing_country__c','Secondary_Passport_Number__c','Secondary_Place_Of_Issue__c'];
  get showSpinner() {
    return this._spinner;
  }
  get showShareHoldersData() {
    return (this.shareHoldersData.length > 0) ? true : false;
  }
  get showDirectorData() {
    return (this.directorsData.length > 0 && this.formName != 'Add Shareholders') ? true : false;
  }
  get showUBOData() {
    return (this.directorsData.length > 0 && this.formName != 'Add Shareholders') ? true : false;
  }
  get daccOptions() {
    return [
        { label: '--None--', value: '' },
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' }
    ];
 }
  set showSpinner(val) {
    this._spinner = val;
  }
  showHelpText() {
    this.showHelp = true;
  }
  hideHelpText() {
    this.showHelp = false;
  }	
  @wire(getObjectInfo, { objectApiName: LA_OBJECT })
  lAInfo;
  @wire(getPicklistValues, { recordTypeId: '$lAInfo.data.defaultRecordTypeId', fieldApiName: OWNER_TYPE })
  wiredPicklistValues({ error, data }) {
    if (data) {
      var options = data.values.map(option => ({ label: option.label, value: option.value }));
      options[0].checked = 'checked';
      this.picklistOptions = options;
      if (this.picklistOptions.length > 0) {
        this.shareHolderSelectedValue = this.picklistOptions[0].value;
        this.sObjects['Owner_Type__c'] = this.picklistOptions[0].value;
      }
    } else if (error) {
    }
  }
  get isShareHolderForm() {
    return (this.formName == 'Add Shareholders' || this.formName == 'Add UBO') ? true : false;
  }  
  get isShareHolderFome1() {
    return (this.formName == 'Add Shareholders') ? true : false;
  } 
  get isCorporateShareholder() {
    return (this.shareholderType == 'Corporate') ? true : false;
  }
  get isSelectedUBOType() {
    return (this.formName == 'Add UBO' && (this.shareholderType == 'Corporate' || this.shareholderType == 'Individual' || this.shareholderType == 'Government / Listed on Stock Exchange')) ? true : false;
  }
  get isIndividualShareholder() {
    return (this.shareholderType == 'Individual') ? true : false;
  }
  get isExceptionUBO() {
    return (this.shareholderType == 'Government / Listed on Stock Exchange') ? true : false;
  }
  get isContactUpdateForm() {
    return (this.formName == 'AllMembers') ? true : false;
  }
  async connectedCallback() {
    try{
      this.showSpinner = true;
      this.isAmendmentCreated = false;
      this.uboOwnershipPercentage = 0;
      this.uboPercentage = 0;
      this.template.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.serviceRequestRecord = await getAccountDetails({srId: this.serviceRequestId});
      this.isShareHolderPage = false;
      await this.getFormDetails();
      this.skipDocUpload = false;
      this.showPersonalInfo=true;
      this.showUBOTypeSection = false;
      this.reqObjectName = "OB_Amendment__c";
      this.formName = this.sectionDetails[0].section.acbox__Action_Page_Flow__r.acbox__Menu_Title__c;
      this.formTemplatetitle = this.sectionDetails[0].section.acbox__Action_Page_Flow__r.acbox__Menu_Title__c;
      console.log('formTemplatUniqueCode::'+this.formTemplatUniqueCode);
      this.setColumns();
      this.setFormParams();
      const accordions = this.template.querySelectorAll(".accordion");
      this.sObjects["sobjectType"] = this.reqObjectName;
      this.sObjects["Onboard_Request__c"] = this.serviceRequestId;
      await this.getFromData();
      this.isUpdateForm = false;
      this.isShareholderSel = true;
      console.log('formTemplatetitle::'+this.formTemplatetitle);
      this.relatedRecords = await this.getRelatedData();
      this.existingRecords = await this.getSelectedRelationInfo();
      let passportNumber;  
      if(this.existingRecords.length > 0){
        this.existingRecords.forEach(item => {
          passportNumber = item.passportNumber;
        });
      }
      if(this.relatedRecords.length > 0){
        this.relatedRecords.forEach(item => {
          if(item.passportNumber === passportNumber){
              this.isAmendmentCreated = true;
          }
        });
      }
      if(this.isAmendmentCreated == true){         
        this.relatedRecordsAll = [...this.relatedRecords];    
      }else{
        this.relatedRecordsAll = [...this.existingRecords, ...this.relatedRecords];    
      } 
      this.showChoosefromExisting = this.relatedRecordsAll.length > 0 ? true : false;
      const event = new CustomEvent("childrendered", {
        detail: {
          childComponentName: "application",
          serviceRequestId: this.serviceRequestId
        }
      });
      this.dispatchEvent(event);
    }catch(error){
      console.error('Error fetching data connected callback', error);
    }
  }
  handleKeyDown(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
    }
  }
  setColumns(){
    this.requiredActionsHeader = [];
    this.requiredActionsHeader.push({label: "Name", stylecss: "flex: 0 0 30%;"});
    this.requiredActionsHeader.push({label: "Passport Number", stylecss: "flex: 0 0 20%;"});
    this.requiredActionsHeader.push({label: "Role", stylecss: "flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;"});
    this.requiredActionsHeader.push({label: "Status", stylecss: "flex: 0 0 10%;"});
    this.requiredActionsHeader.push({label: "Action", stylecss: "flex: 0 0 10%;"});
    this.uboColumns = [];
    this.uboColumns.push({label: "Name", stylecss: "flex: 0 0 20%;"});
    this.uboColumns.push({label: "Type", stylecss: "flex: 0 0 15%;"});
    this.uboColumns.push({label: "Ownership %", stylecss: "flex: 0 0 10%;"});
    this.uboColumns.push({label: "Role", stylecss: "flex: 0 0 20%; word-break: break-word; white-space: break-spaces; max-width: 200px;"});
    this.uboColumns.push({label: "Passport / License #", stylecss: "flex: 0 0 15%;"});
    this.uboColumns.push({label: "Status", stylecss: "flex: 0 0 10%;"});
    this.uboColumns.push({label: "Action", stylecss: "flex: 0 0 10%;"});
    this.relatedDataColumns = [];
    this.relatedDataColumns.push({label: "Name", stylecss: "flex: 0 0 30%;"});
    this.relatedDataColumns.push({label: "Passport Number", stylecss: "flex: 0 0 30%;"});
    this.relatedDataColumns.push({label: "Role", stylecss: "flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;"});
    this.relatedDataColumns.push({label: "Action", stylecss: "flex: 0 0 10%;"});
  }
  addRow() {
    var initialValue = Object.assign(
      {},
      JSON.parse(JSON.stringify(this.childObjectInstance))
    );
    initialValue.count = this.listChild.length + 1;
    this.sectionDetailsChild.push(initialValue);
    this.listChild.push({ sobjectType: this.childObjectName });
    for (var i = 0; i < this.listChild.length; i++) {
      this.listChild[i].count = i + 1;
    }
  }
  async deleteRow(event) {
    const index = event.target.dataset.index;
    if (event.target.dataset.id) {
      this.showSpinner = true;
      let validation = { validity: true, flowId: this.currentFlowId };
      try {
        let result = apexDeleteRecordServiceRequest({
          objectName: this.childObjectName,
          recordId: event.target.dataset.id
        });
        if (result) {
          if (true) {
            this.showSpinner = false;
            this.sectionDetailsChild.splice(index, 1);
            this.sectionDetailsChild = [...this.sectionDetailsChild];
            this.listChild.splice(index, 1);
            this.listChild = [...this.listChild];
            for (var i = 0; i < this.sectionDetailsChild.length; i++) {
              this.sectionDetailsChild[i].count = i + 1;
            }
          } else {
            this.showSpinner = false;
            validation.recId = result.recId;
            validation.requestName = result.msg;
          }
        } else {
          this.showSpinner = false;
          validation.validity = false;
        }
      } catch (error) {
        this.showSpinner = false;
        validation.validity = false;
      }
    } else {
      this.sectionDetailsChild.splice(index, 1);
      this.sectionDetailsChild = [...this.sectionDetailsChild];
      this.listChild.splice(index, 1);
      this.listChild = [...this.listChild];
      for (var i = 0; i < this.sectionDetailsChild.length; i++) {
        this.sectionDetailsChild[i].count = i + 1;
      }
    }
  }
  handleDeleteRow(event) {
    const index = event.target.dataset.index;
    this.formRows.splice(index, 1);
    this.formRows = [...this.formRows];
  }
  handleUpdateSectionInfo(e) {
        this.updateSectionSelectedValue = e.detail.value;
    }
  async handleInputValuesMultiple(event) {
    let fieldValue = event.target.value;
    if (fieldValue != null && fieldValue != "") {
      let key = event.target.dataset.index;
      let fieldAPIName = event.target.dataset.targetId;
      let fieldType = event.target.dataset.targetType;
      let inputregex = event.target.dataset.targetRegex;
      let inputJSFunction = event.target.dataset.targetChangejsfunction;
      let errorMessage = event.target.dataset.targetErrormessage;
      if (inputregex && inputregex != "" && inputregex != null) {
        if (!new RegExp(inputregex, "g").test(fieldValue)) {
          this.processMultiValidationDetails(
            fieldAPIName,
            true,
            "Please enter valid format",
            fieldValue,
            event.target.dataset.index
          );
          return;
        } else {
          this.processMultiValidationDetails(
            fieldAPIName,
            false,
            "",
            fieldValue,
            event.target.dataset.index
          );
          this.dirtyFlag =
            this.listChild[key][fieldAPIName] === fieldValue ? false : true;
          if (this.countryCodes[fieldAPIName] && this.countryCodes[fieldAPIName] != '') {
            this.listChild[key][fieldAPIName] = this.countryCodes[fieldAPIName] + '-' + fieldValue;
          }
          else {
            this.listChild[key][fieldAPIName] = fieldValue;
          }
        }
      }
      if (
        inputJSFunction &&
        this.dyn_functions.hasOwnProperty(inputJSFunction)
      ) {
        let result = await this.dyn_functions[inputJSFunction](
          fieldValue,
          this.listChild[key]
        );
        if ((!result && typeof result === 'boolean')) {
          this.processMultiValidationDetails(
            fieldAPIName,
            true,
            errorMessage,
            fieldValue,
            event.target.dataset.index
          );
        } else if ((!result && typeof result === 'string')) {
          this.processMultiValidationDetails(
            fieldAPIName,
            false,
            result,
            fieldValue,
            event.target.dataset.index
          );
        } else {
          this.processMultiValidationDetails(
            fieldAPIName,
            false,
            "",
            fieldValue,
            event.target.dataset.index
          );
          this.dirtyFlag =
            this.listChild[key][fieldAPIName] === fieldValue ? false : true;
          if (this.countryCodes[fieldAPIName] && this.countryCodes[fieldAPIName] != '') {
            this.listChild[key][fieldAPIName] = this.countryCodes[fieldAPIName] + '-' + fieldValue;
          }
          else {
            this.listChild[key][fieldAPIName] = fieldValue;
          }
        }
      } else {
        if (fieldType == "Time") {
          fieldValue = fieldValue;
        }
        this.dirtyFlag =
          this.listChild[key][fieldAPIName] === fieldValue ? false : true;
        if (this.countryCodes[fieldAPIName] && this.countryCodes[fieldAPIName] != '') {
          this.listChild[key][fieldAPIName] = this.countryCodes[fieldAPIName] + '-' + fieldValue;
        }
        else {
          this.listChild[key][fieldAPIName] = fieldValue;
        }
        this.processMultiValidationDetails(
          fieldAPIName,
          false,
          "",
          fieldValue,
          event.target.dataset.index
        );
        if (
          event.target.dataset.targetSr == this.TRUE_TEXT ||
          event.target.dataset.targetSr === true
        ) {
          this.hasChangeFieldName = fieldAPIName;
          this.stopNavigation = true;
          this.xCreateServiceRequest();
        }
      }
    }
  }
  validateFields() {
    return [...this.template.querySelectorAll("lightning-input-field")].reduce(
      (validSoFar, field) => {
        return validSoFar && field.reportValidity();
      },
      true
    );
  }
  validateInputFields() {
    return [...this.template.querySelectorAll("lightning-input")].reduce(
      (validSoFar, field) => {
        console.log('field--->'+field);
        return validSoFar && field.reportValidity();
      },
      true
    );
  }
  toggleAccordion(event) {
    console.log("click33");
    const accordion_header = event.target;
    const accordion = accordion_header.parentElement;
    if (accordion && accordion.classList) accordion.classList.toggle("active");
  }
  handleAllAccordionSection(event) {
    this.isExpand = !this.isExpand;
    const accordionElements = this.template.querySelectorAll('.accordion');
    accordionElements.forEach(item => {
      item.classList.toggle('active');
    });
  }
  async handleInputValues(event) {
    let fieldValue = event.target.value;
    let targetSr = event.target.dataset.targetSr;
    const {
      targetId: fieldAPIName,
      targetType,
      targetRegex: inputregex,
      targetChangejsfunction: inputJSFunction,
      targetErrormessage: errorMessage = "Please enter valid data."
    } = event.target.dataset;
    this.picklistOptions.forEach(obj =>{
          if(obj['value'] == this.shareHolderSelectedValue){
            obj['checked'] = 'checked';
          }
        })
      if(fieldAPIName == 'Owner_Type__c'){
         this.documentName = '';
         this.uploadedFileName = '';
         this.validationMessage = '';
         this.showChoosefromExisting = this.relatedRecordsAll.length > 0 ? true : false;
         this.shareholderType = fieldValue;
         this.shareHolderSelectedValue = fieldValue;
         this.helpText = `Please upload a clear, coloured scan of Applicant’s passport pages displaying personal details. Please ensure that your passport is valid for atleast 
                            six months from the date of submission. The maximum file size allowed is 2mb and accepted file formats are ".pdf,.jpeg,.jpg".`;
          if(fieldValue == 'Corporate'){
            this.documentText = 'Upload a License Copy';
            this.helpText = 'Please upload company Trade License copy.';
          }else if(fieldValue == 'Individual'){
            this.documentText = 'Upload a Passport Copy';
          }else if(fieldValue == 'Government / Listed on Stock Exchange'){
            this.documentText = 'Upload a License Copy (if applicable)';
            this.helpText = 'Please upload company Trade License copy.';
          }
          if(this.shareHolderSelectedValue == 'Individual'){
             this.isNotDACCRegistered = true;
             this.showPersonalInfo = false;
             this.showUBOTypeSection = true;
             for(var i = 0; i < this.sectionDetails.length; i++) { 
              if(this.sectionDetails[i].section.acbox__Type__c == 'UBOType')
               this.sectionDetails[i].section.isRenderByDefault = true;
              else
                this.sectionDetails[i].section.isRenderByDefault = false;
             }
            } else if(this.shareHolderSelectedValue == 'Corporate'){
              this.isNotDACCRegistered = true;
              this.showPersonalInfo = false;
              this.showUBOTypeSection = true;
              this.showChoosefromPeople = false;
              this.showChoosefromExisting = false;
              console.log('shareholderType::'+this.shareholderType);          
              for (var i = 0; i < this.sectionDetails.length; i++) {
                if(this.sectionDetails[i].section.acbox__Type__c == 'UBOType')
                  this.sectionDetails[i].section.isRenderByDefault = true;
                else 
                  this.sectionDetails[i].section.isRenderByDefault = false; 
              }
            }
            else if(this.shareHolderSelectedValue == 'Government / Listed on Stock Exchange'){
              this.isNotDACCRegistered = true;
              this.showPersonalInfo = false;
              this.showUBOTypeSection = true;
              this.showChoosefromPeople = false;
              this.showChoosefromExisting = false;
              console.log('shareholderType::'+this.shareholderType); 
              console.log('isSelectedUBOType::'+this.isSelectedUBOType);
              for (var i = 0; i < this.sectionDetails.length; i++){
                if(this.sectionDetails[i].section.acbox__Type__c == 'UBOType' || this.sectionDetails[i].section.acbox__Type__c == 'Government / Listed on Stock Exchange')
                  this.sectionDetails[i].section.isRenderByDefault = true;
                else 
                  this.sectionDetails[i].section.isRenderByDefault = false; 
            }
        } 
      }else if(fieldAPIName == 'Have_you_visited_the_UAE_before__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c'){
                  if(fieldValue == 'Yes'){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                } 
                if(fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c'){
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';                 
                }
              }
          }
      }else if(fieldAPIName == 'Emirates_ID__c'){
          for(var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for(var j = 0; j < fields.length; j++) {
                const sanitizedInput = fieldValue.replace(/[^0-9]/g, '');
                let formattedInput = '';
                const positions = [3, 4, 7];
                let currentIndex = 0;
                for(let i = 0; i < sanitizedInput.length; i++) {
                    formattedInput += sanitizedInput[i];
                    if (positions.length > 0 && (i - currentIndex + 1) === positions[0]) {
                        formattedInput += '-';
                        currentIndex = i + 1;
                        positions.shift();
                    }
                }
                fieldValue = formattedInput;
              }
          }
      }else if(fieldAPIName == 'Exception_Company_Type__c'){
        for (var i = 0; i < this.sectionDetails.length; i++){
            if(this.sectionDetails[i].section.acbox__Type__c == 'UBOType' || this.sectionDetails[i].section.acbox__Type__c == 'Government / Listed on Stock Exchange')
              this.sectionDetails[i].section.isRenderByDefault = true;   
              else
              this.sectionDetails[i].section.isRenderByDefault = false; 
          }         
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
            for (var j = 0; j < fields.length; j++) {
              if(fields[j].Name == 'Stock Exchange'){
                  if(fieldValue == 'A subsidiary or branch of company listed in a recognized stock exchange'){
                      fields[j].isRenderByDefault = true;
                  }else{
                      fields[j].isRenderByDefault = false;
                      fields[j].acbox__Default_Value__c ='';
                  }                  
              }
              if(fields[j].Name == 'Government Entity Name'){       
                  if(fieldValue == 'A subsidiary or branch of a government owned entity'){          
                      fields[j].isRenderByDefault = true;
                  }else{
                      fields[j].isRenderByDefault = false;
                      fields[j].acbox__Default_Value__c ='';
                  }                 
                }                
            }
          }
      }else if(fieldAPIName == 'Type_of_Politically_Exposed_Person__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'PEP_Other__c'){
                  if(fieldValue == 'Other'){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                      fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                }
              }
          }
      }
    if (fieldValue === null || fieldValue === "") return;
    if (
      (inputregex &&
        inputregex !== "" &&
        !new RegExp(inputregex, "g").test(fieldValue)) ||
      (inputJSFunction && this.dyn_functions.hasOwnProperty(inputJSFunction))
    ) {
      let result = inputJSFunction
        ? await this.dyn_functions[inputJSFunction](fieldValue, this.sObjects)
        : false;
      if (!result && typeof result === 'boolean') {
        this.processValidationDetails(
          fieldAPIName,
          true,
          errorMessage,
          fieldValue
        );
        if (this.countryCodes[fieldAPIName] && this.countryCodes[fieldAPIName] != '') {
          this.sObjects[fieldAPIName] = this.countryCodes[fieldAPIName] + '-' + fieldValue;
        }
        else {
          this.sObjects[fieldAPIName] = fieldValue;
        }
        return;
      } else if (result && typeof result === 'string') {
        this.processValidationDetails(
          fieldAPIName,
          true,
          result,
          fieldValue
        );
        return;
      } else if (result && typeof result === "object") {
        if (result.clearValue && typeof result.clearValue === "boolean") {
          event.target.value = "";
          fieldValue = "";
        } else if (result.clearValue && typeof result.clearValue === "string") {
          event.target.value = result.clearValue;
          fieldValue = result.clearValue;
        }
        this.processValidationDetails(
          fieldAPIName,
          true,
          result.errMsg,
          fieldValue
        );
        return;
      }
    }
    if (targetType === "Time") {
      fieldValue = fieldValue;
    }
    if (this.countryCodes[fieldAPIName] && this.countryCodes[fieldAPIName] != '') {
      this.sObjects[fieldAPIName] = this.countryCodes[fieldAPIName] + '-' + fieldValue;
    }
    else {
      this.sObjects[fieldAPIName] = fieldValue;
    }
    this.processValidationDetails(fieldAPIName, false, "", fieldValue);
    if (
      targetSr === this.TRUE_TEXT ||
      targetSr === true
    ) {
      this.hasChangeFieldName = fieldAPIName;
      this.stopNavigation = true;
      this.xCreateServiceRequest();
    }
  }
  handleLookupPickListValue(event) {
    if (event.detail.value) {
      this.sObjects[event.detail.targetId] = event.detail.value;
      if (
        event.detail.targetSr == this.TRUE_TEXT ||
        event.detail.targetSr === true
      ) {
        this.hasChangeFieldName = event.detail.targetId;
        this.stopNavigation = true;
        this.xCreateServiceRequest();
      }
    }
  }
  handleMobileCountryCode(event) {
    let countryCode = event.detail.value;
    let fieldName = event.detail.mobileFieldApiName;
    this.sObjects[fieldName] = this.sObjects[fieldName] == '' ? countryCode : countryCode + '-' + this.sObjects[fieldName];
    this.countryCodes[fieldName] = countryCode;
  }
  async handleToggleChange(event) {
    this.sObjects[event.detail.fieldapi] = event.detail.value;
    let inputJSFunction = event.detail.onChangeJS;
    let errorMsg = event.detail.customError ? event.detail.customError : 'Please enter Valid Data';
    let result = inputJSFunction ? await this.dyn_functions[inputJSFunction](event.detail.value, this.sObjects) : true;
    let fieldAPIName = event.detail.fieldapi;
    let fieldValue = event.detail.value;
    if(fieldValue == 'Yes'){
      this.isChecked = true;
    }else{
      this.isChecked = false;
    }
    console.log('isChecked-->'+this.isChecked);
    console.log('PROCESSVAL:: ' + event.detail.fieldapi + '::: ' + event.detail.value + '::: ' + JSON.parse(result));
    if(fieldAPIName == 'Are_you_resident_in_the_UAE__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c'){
                  if(fieldValue == 'Yes' && result == true){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                }
              }
          }
      }else if(fieldAPIName == 'Are_you_a_Politically_Exposed_Person__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c'){
                  if(fieldValue == 'Yes' && result == true){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }                 
                }
                if(fields[j].acbox__Field_API_Name__c == 'PEP_Other__c'){                  
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                 }
              }
          }
      }else if(fieldAPIName == 'Are_you_the_custodian__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c'){
                  if(fieldValue == 'Yes' && result == true){
                     fields[j].isRenderByDefault = false;
                  }else{
                     fields[j].isRenderByDefault = true;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                }
              }
          }
      }else if(fieldAPIName == 'Do_you_have_dual_Nationality__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c'
                   || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issuing_country__c'
                   || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Place_Of_Issue__c'){
                  if(fieldValue == 'Yes' && result == true){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                      fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                }
              }
          }
      }
    if(!result) {
      this.processValidationDetails(
        event.detail.fieldapi,
        true,
        errorMsg,
        event.detail.value
      );
      return;
    }
    if (
      event.detail.targetSr == this.TRUE_TEXT ||
      event.detail.targetSr === true
    ) {
      this.hasChangeFieldName = event.detail.fieldapi;
      this.stopNavigation = true;
      this.xCreateServiceRequest();
    }
  }
  async xCreateServiceRequest() {
    this.showSpinner = true;
    let fields = [];
    let validation = { validity: true, flowId: this.currentFlowId };
    if (!this.stopNavigation) {
      this.template
        .querySelectorAll("lightning-input-field")
        .forEach((element) => element.reportValidity());
      let isValid = this.validateFields();
      if (!isValid) {
        this.showSpinner = false;
        return;
      }
      let isInputFieldValid = this.validateInputFields();
      if(!isInputFieldValid) {
        this.showSpinner = false;
        return;
      }
      for (var i = 0; i < this.sectionDetails.length; i++) {
        if (!this.sectionDetails[i].section.acbox__Is_Child__c) {
          fields = this.sectionDetails[i].sectionDetails;
          for (var j = 0; j < fields.length; j++) {
            let fieldVal;
            if (
              this.sObjects.hasOwnProperty(fields[j].acbox__Field_API_Name__c)
            ) {
              fieldVal = this.sObjects[fields[j].acbox__Field_API_Name__c];
            } else {
              let target = this.template.querySelector(
                `[data-id="${fields[j].acbox__Field_API_Name__c}"]`
              );
              if (target != null) {
                fieldVal = target.value();
                this.sObjects[fields[j].acbox__Field_API_Name__c] =
                  target.value();
              }
            }
            if (
              (fields[j].acbox__Is_required__c &&
                fields[j].acbox__Component_Type__c != "Output Field" &&
                !fields[j].acbox__Is_Disable__c &&
                (fieldVal == "" || fieldVal == null)) ||
              fields[j].hasError
            ) {
              fields[j].hasError = true;
              validation.validity = false;
            }
          }
        }
      }
      for (var i = 0; i < this.sectionDetailsChild.length; i++) {
        if (!this.sectionDetailsChild[i].section.acbox__Is_Child__c) {
          fields = this.sectionDetailsChild[i].sectionDetailsChild;
          for (var j = 0; j < fields.length; j++) {
            let fieldVal;
            if (
              this.sObjects.hasOwnProperty(fields[j].acbox__Field_API_Name__c)
            ) {
              fieldVal = this.sObjects[fields[j].acbox__Field_API_Name__c];
            } else {
              let target = this.template.querySelector(
                `[data-id="${fields[j].acbox__Field_API_Name__c}"]`
              );
              if (target != null) {
                fieldVal = target.value();
                this.sObjects[fields[j].acbox__Field_API_Name__c] =
                  target.value();
              }
            }
            if (
              (fields[j].acbox__Is_required__c &&
                fields[j].acbox__Component_Type__c != "Output Field" &&
                !fields[j].acbox__Is_Disable__c &&
                (fieldVal == "" || fieldVal == null)) ||
              fields[j].hasError
            ) {
              fields[j].hasError = true;
              validation.validity = false;
            }
          }
        }
      }
    }
    if (validation.validity || this.stopNavigation) {
      this.sObjects["Action_Template__c"] = this.actionTempId;
      if (this.serviceRequestId != "") {
        this.sObjects["Id"] = this.serviceRequestId;
      }
      if (this.srRecordTypeId != "") {
        this.sObjects["RecordTypeId"] = this.srRecordTypeId;
      }
      try {
        for (var i = 0; i < this.listChild.length; i++) {
          this.listChild[i].sobjectType = this.childObjectName;
        }
        if (this.sObjects['sobjectType'] == 'OB_Amendment__c') {
          await this.getFormDetails();
          this.refreshValues();
          this.connectedCallback();
          validation.validity = true;
          validation.error = '';
        } else {
          let result = await apexCreateServiceRequest({
            sObj: this.sObjects,
            lstsObj: this.listChild,
            parentObjectFieldName: this.parentObjectFieldName
              ? this.parentObjectFieldName.length == 0
                ? ""
                : this.parentObjectFieldName
              : "",
            actionPageFlowId: this.currentFlowId,
            hasChangeFieldAPIName: this.hasChangeFieldName
          });
          if (result.isSuccess) {
            if (this.stopNavigation) {
              this.sObjects["Id"] = result.recId;
              this.serviceRequestId = result.recId;
              await this.getFormDetails();
              this.refreshValues();
            } else {
              this.showSpinner = false;
              validation.recId = result.recId;
              validation.requestName = result.msg;
            }
          } else {
            this.showSpinner = false;
            validation.validity = false;
            let errorMessagePattern = /FIELD_CUSTOM_VALIDATION_EXCEPTION, (.+):/;
            let match = result.error.match(errorMessagePattern);
            let errorMessage = match
              ? match[1].trim()
              : "Unknown error. Please Contact Customer Support";
            validation.error = errorMessage;
          }
        }
      } catch (error) {
        this.showSpinner = false;
        validation.validity = false;
        validation.error = error.body.message;
      }
    } else {
      validation.validity = false;
      this.showSpinner = false;
      validation.error = "Please verify all field on application.";
    }
    this.showSpinner = false;
    return validation;
  }
  @api
  async goToPreviousPage() {    
    this.showSpinner = true;
    getPreviousPageflowDetails({ previousPageFlow: this.formName, actionTemplateID: this.actionTempId })
      .then(result => {
        console.log('result previous page--->'+result);
        if (result.Id == undefined || result.Id == null) {
          this[NavigationMixin.Navigate]({
            type: "comm__namedPage",
            attributes: {
              name: "Requests__c"
            }
          });
        } else {
          console.log('Apex method result:', result);
          this.currentFlowId = result.Id;
          this.formName = result.Name;
          this.updateFormRole();
          this.sectionDetails = [];
          this.connectedCallback();
        } 
      })
      .catch(error => {
        console.error('Apex method error:', error);
      });
  }
  async createReqDocuments(){
    let flag = { validity: true };
      await createReqDocuments({reqId: this.serviceRequestId,reqType: 'CompanyRegistration'})
        .then(result => {
           if(result != 'Success'){
             flag.validity = false;
             flag.error = result;
           }
        }).catch(error => {
        console.error('Apex method error:', error);
      });
        return flag;
  }
  async createReqFee(){
    let flag = { validity: true };
      await createReqFee({reqId: this.serviceRequestId,reqType: 'CompanyRegistration'})
        .then(result => {
           if(result != 'Success'){
             flag.validity = false;
             flag.error = result;
           }
        }).catch(error => {
        console.error('Apex method error:', error);
      });
        return flag;
  }
  @api
  async goToNextPage() {
    this.showSpinner = true;
    let result = await checkCorporateUBO({ srId: this.serviceRequestId });
    console.log('corporate ubo exist====='+result);
    console.log('serviceRequestId====='+this.serviceRequestId);
    if (result) {
      if(result=='No'){
        let flag = { validity: false };
        flag.validity = false;
        flag.error = "Kindly add the mother company as a Corporate UBO to proceed.";
        this.showSpinner = false;
        return flag;
      }
    }
    let results = await checkCorporateUBOMotherCompany({ srId: this.serviceRequestId });
    if (results) {
      if(results=='No'){
        let flag = { validity: false };
        flag.validity = false;
        flag.error = "Kindly add the mother company as a Corporate UBO to proceed.";
        this.showSpinner = false;
        return flag;
      }
    }
    if(this.formTemplatetitle == 'Add Shareholders' || this.formTemplatetitle == 'Add Board Members' || this.formTemplatetitle == 'Add Directors'|| this.formTemplatetitle == 'Add Secretary' || this.formTemplatetitle == 'Add General Manager' || this.formTemplatetitle == 'Add legal Representative' || this.formTemplatetitle == 'Add UBO'){
      let flag =  await this.checkAmmendmentRecordsWithRole();
      if(!flag.validity){
        this.showSpinner = false;
        return flag;
      }
    }
    if(this.formTemplatetitle == 'Add Shareholders' && this.serviceRequestRecord.Share_Capital__c < 300000 ){
      let flag = { validity: false };
      flag.validity = false;
      flag.error = "Share Capital amount should not be less than minimum required amount AED 300000.";
      this.showSpinner = false;
      return flag;
    }
    let flag =  await this.createReqDocuments();
      if(!flag.validity){
        this.showSpinner = false;
      return flag;
    }
    let flag1 =  await this.createReqFee();
      if(!flag1.validity){
        this.showSpinner = false;
      return flag1;
    }
    await getNextPageflowDetails({ previousPageFlow: this.formName, actionTemplateID: this.actionTempId })
      .then(result => {
        console.log('Apex method result:', result);
        this.currentFlowId = result.Id;
        this.formName = result.Name;
        this.updateFormRole();
        this.sectionDetails = [];
        this.obrecordId = '';       
        this.connectedCallback();        
      })
      .catch(error => {
        console.error('Apex method error:', error);
      });
    let validation = {
      validity: true,
      flowId: this.currentFlowId
    };
    return validation;
  }
  async checkAmmendmentRecordsWithRole(){
     let flag = { validity: true };
     this.noActiveAmmendment=false;
     this.directorsListTemp=[];
     this.shareholdersListTemp=[];
     this.managerListTemp=[];
     this.secretaryListTemp=[];
     this.legalRepListTemp=[];
     this.uboListTemp=[];
     this.uboListIndividual=[];
     this.uboListIndividualandCorporate = [];
     this.uboListGovenment = [];
     let total_BO_Pecentage = 0;
    await getExistingAndNewAmmendmentRecordsWithRole({recordId: this.serviceRequestId})
    .then(result => {
      this.ammListTemp=result.amendmentList;
      this.ammListTemp.forEach(record => {
            if (record.Role__c && typeof record.Role__c === 'string') {
                const roles = record.Role__c.split(';');
                if (roles.includes('Director')) {
                    this.directorsListTemp.push(record);
                }
                if (roles.includes('Shareholder')) {
                    this.shareholdersListTemp.push(record);
                }
                if (roles.includes('Manager')) {
                    this.managerListTemp.push(record);
                }
                if (roles.includes('Secretary')) {
                    this.secretaryListTemp.push(record);
                }
                if (roles.includes('UBO')) {
                    this.uboListTemp.push(record);
                }
            }
        });
      if((this.directorsListTemp.length ==0 && this.formRole=='Director')||(this.shareholdersListTemp.length ==0 && this.formRole=='Shareholder')||
      (this.secretaryListTemp.length ==0 && this.formRole=='Secretary')|| (this.managerListTemp.length ==0 && this.formRole=='Manager') || 
      (this.uboListTemp.length ==0 && this.formRole=='UBO')){
        this.noActiveAmmendment=true;
      }
      if(this.uboListTemp.length > 0 && this.formName=='Add UBO'){
        this.uboListTemp.forEach(record => {
            if(record.Owner_Type__c !='Corporate'){
                this.uboListIndividual.push(record);
            } 
            if(record.Owner_Type__c =='Corporate' || record.Owner_Type__c =='Individual'){
              this.uboListIndividualandCorporate.push(record);
              total_BO_Pecentage = parseFloat(total_BO_Pecentage)+parseFloat(record.Status_of_BO_Ownership__c);
            }
            if(record.Owner_Type__c =='Government / Listed on Stock Exchange'){
              this.uboListGovenment.push(record);
            }
        });
      }
      console.log('total_BO_Pecentage--->'+total_BO_Pecentage);
      if(this.uboListTemp.length == 0){
        flag.validity = false;
        flag.error = "Atleast one record should be added before proceding further";  
        return flag;      
      }
      if(this.serviceRequestRecord.Legal_Type__c == 'DWC-LLC'){
        if(this.shareholdersListTemp.length == 0){
          flag.validity = false;
          flag.error = "Please add atleast one shareholder from the shareholder page.";
          return flag;
        }
        if(this.directorsListTemp.length == 0){
          flag.validity = false;
          flag.error = "Please add atleast one director from the board member page.";
          return flag;
        }
        if(this.managerListTemp.length == 0){
          flag.validity = false;
          flag.error = "Please add atleast one general manager from the board member page";
          return flag;
        }
        if(this.secretaryListTemp.length == 0){
          flag.validity = false;
          flag.error = "Please add atleast one secretary from the board member page";
          return flag;
        }
        if(this.managerListTemp.length > 1){
          flag.validity = false;
          flag.error = "The company should have only one General Manager.";
          return flag;
        }        
        if(this.secretaryListTemp.length > 1){
          flag.validity = false;
          flag.error = "The company should have only one Secretary.";
          return flag;
        }        
      }
      if(this.serviceRequestRecord.Legal_Type__c == 'DWC-Branch'){
        if(this.managerListTemp.length == 0){
          flag.validity = false;
          flag.error = "Please add atleast one general manager from the board member page";
          return flag;
        }
        if(this.managerListTemp.length > 1){
          flag.validity = false;
          flag.error = "The company should have only one General Manager.";
          return flag;
        }
      }
      if(this.uboListIndividual.length == 0){
        flag.validity = false;
        flag.error = "At least one individual record must be added if the UBO is corporate before proceeding further.";  
        return flag;      
      }
      if(this.uboListIndividualandCorporate.length > 0 && this.uboListGovenment == 0){
        if(total_BO_Pecentage < 100 || total_BO_Pecentage > 100){
          flag.validity = false;
          flag.error = "Please make sure that the total Beneficial Ownership (BO) percentage for all Ultimate Beneficial Owners (UBOs) adds up to 100%, unless a UBO is classified as Government or Listed on a Stock Exchange.";  
          return flag;   
        }   
      }
      console.log('====='+this.noActiveAmmendment);
      })
      .catch(error => {
        console.error('Apex method error:', error);
      });
      return flag;
  }
  updateFormRole() {
    if (this.formName == 'Add Shareholders') {
      this.formRole = 'Shareholder';
    } else if( this.formName == 'Add Board Members' || this.formName == 'Add Directors' || this.formName == 'Add General Manager' || this.formName == 'Add Secretary'){
      this.formRole = 'Director;Manager;Secretary';
    }else if (this.formName == 'Add Legal Representative') {
      this.formRole = 'Legal Representative';
    } else if (this.formName == 'Add UBO') {
      this.formRole = 'UBO';
    }
  }
  setFormParams() {
    var optIndividual ={label:'Individual',value:'Individual'};
    var optCorp ={label:'Corporate', value:'Corporate'};
    var optExceptionUBO ={label:'Government / Listed on Stock Exchange', value:'Government / Listed on Stock Exchange'};
    var pickOptions = [];
    pickOptions.push(optIndividual);
    pickOptions.push(optCorp);
    pickOptions.push(optExceptionUBO);
    this.picklistOptions =  pickOptions;
    if(this.formName == 'Add Shareholders'){ 
      this.formHeader = 'Shareholder Details';
      this.formRole = 'Shareholder';
      this.groupName = 'Select shareholder type'; 
      this.isShareHolderPage = true;    
      this.picklistOptions = this.picklistOptions.filter(item => item.value !== "Government / Listed on Stock Exchange");
      this.shareHolderSelectedValue = 'Individual';
    }
    if (this.formName == 'Update Shareholders') {
      this.formHeader = 'Amendment details';
      this.formRole = 'Shareholder';
      this.picklistOptions = [];
       this.shareHolderSelectedValue = 'Individual';
    }
     if(this.formName == 'Add Board Members' || this.formName == 'Add Directors' || this.formName == "Add Secretary" || this.formName == "Add Manager") {
      this.formHeader = 'Board Member Details';
      this.formRole = 'Director;Secretary;Manager';
      this.picklistOptions = [];
       this.shareHolderSelectedValue = 'Individual';
    }
    if(this.formName == 'Add Directors') {
      this.formHeader = 'Director Details';
      this.formRole = 'Director';
      this.picklistOptions = [];
      this.shareHolderSelectedValue = 'Individual';
    }
    if(this.formName == "Add UBO") {
      this.formHeader = "Ultimate Beneficiary Owner Details";
      this.formRole = 'UBO';
      this.shareHolderSelectedValue = 'Individual';
      this.groupName = 'Select UBO type';
      this.isUBOForm = true;
    }
    if (this.formName == "Add Secretary") {
      this.formHeader = "Secretary Details";
      this.formRole = 'Secretary';
      this.picklistOptions = [];
      this.shareHolderSelectedValue = 'Individual';
    }
     if (this.formName == "Add General Manager") {
      this.formHeader = "Manager Details";
      this.formRole = 'Manager';
      this.picklistOptions = [];
      this.shareHolderSelectedValue = 'Individual';
    }
     if (this.formName == "Add Legal Representative") {
      this.formHeader = "Legal Representative";
      this.formRole = 'Legal Representative';
      this.picklistOptions = [];
      this.shareHolderSelectedValue = 'Individual';
    }
  }
  async getFormDetails() {
    var empId;
    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    if (urlParams.has("EmpId")) {
      empId = urlParams.get("EmpId");
    }
    this.uploadedFileName = '';
    this.stopNavigation = false;
    this.obrecordId = '';
    let result = await getApplicationDetails({
      actionTempId: this.actionTempId,
      actionPageFlowId: this.currentFlowId,
      srId: this.serviceRequestId,
      empId: empId,
      isReadOnly: false
    });
    if(result){
      this.sectionDetails = [];
      this.dependentPickListValues = [];
      this.picklistValues = [];
      this.fieldsGroupBy = {};
      let response = JSON.parse(result.response);
      this.menutext = result.templateRec[0].Menu_Text__c;
      this.formTemplatUniqueCode = result.templateRec[0].acbox__Unique_Code__c;
      if (result.templateRec && this.menutext == "Day Pass") {
        this.buttonlabel = "Add New Visitor";
      } else this.buttonlabel = "Add New Material";
      if (!this.isReqGenerated && response.sr_Id) {
        let paramMap = new Map([["atid", this.actionTempId]]);
        paramMap.set("recID", response.sr_Id);
        const queryString = window.location.search;
        const urlParams = new URLSearchParams(queryString);
        if (urlParams.has("EmpId")) {
          paramMap.set("EmpId", urlParams.get("EmpId"));
        }
        if (this.returnURL) paramMap.set("returnURL", this.returnURL);
        redirectToApplication(paramMap, "application");
      }
      this.sectionDetails = response.FormDetails;
      console.log('sectionDetails::'+JSON.stringify(this.sectionDetails));
      this.serviceRequestId = response.sr_Id;
      this.srRecordTypeId = response.srRecordTypeId;
      let fields = [];
      let tempFields = [];
      this.sObjects.Request_Type__c;
      for (var i = 0; i < this.sectionDetails.length; i++) {
        if(this.sectionDetails[i].section.acbox__Type__c == 'UBOType'){
           this.sectionDetails[i].section.isRenderByDefault = true;
          }
          else{
            this.sectionDetails[i].section.isRenderByDefault = false;
          }      
        fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if(this.fieldsRenderByRule.includes(fields[j].acbox__Field_API_Name__c)){
            fields[j].isRenderByDefault = false;
          }else{
            fields[j].isRenderByDefault = true;
          }
          if (response.recData != null) {
            fields[j].acbox__Default_Value__c = response.recData[
              fields[j].acbox__Field_API_Name__c
            ]
              ? response.recData[fields[j].acbox__Field_API_Name__c]
              : "";
            this.sObjects[fields[j].acbox__Field_API_Name__c] =
              fields[j].acbox__Default_Value__c;
          }
          if (
            fields[j].acbox__Field_type__c == this.TOGGLE_TEXT_PICKLIST ||
            fields[j].acbox__Field_type__c == this.TOGGLE_TEXT_CHKBX
          ) {
            fields[j].isToggleInput = true;
          } else {
            fields[j].isToggleInput = false;
          }
          if (
            fields[j].acbox__Field_type__c == this.PICKLIST_TEXT ||
            fields[j].acbox__Field_type__c == this.MULTIPICKLIST_TEXT ||
            fields[j].acbox__Field_type__c == this.RADIO_TEXT ||
            fields[j].acbox__Field_type__c == this.CHECKBOX_TEXT ||
            fields[j].acbox__Field_type__c == "Lookup"
          ) {
            fields[j].EVT_onChange = true;
          } else if (
            fields[j].acbox__Placeholder__c &&
            fields[j].acbox__Placeholder__c != null &&
            fields[j].acbox__Placeholder__c != ""
          ) {
            fields[j].isCustomPlaceholder = true;
          }
          fields[j].colCount =
            this.sectionDetails[i].section.acbox__Columns__c != null &&
              fields[j].acbox__Field_type__c != "Blank"
              ? this.sectionDetails[i].section.acbox__Columns__c
              : 1;
          if (fields[j].acbox__Type__c == "" || !fields[j].acbox__Type__c) {
            fields[j].showSectionDetail = true;
          } else if (this.isReadOnly && fields[j].acbox__Type__c == "Edit") {
            fields[j].showSectionDetail = false;
          } else if (!this.isReadOnly && fields[j].acbox__Type__c == "View") {
            fields[j].showSectionDetail = false;
          } else {
            fields[j].showSectionDetail = true;
          }
          if (
            fields[j].acbox__Component_Type__c == "Output Field" ||
            this.isReadOnly
          ) {
            fields[j].isOutput = true;
          }
          if (
            this.sObjects.hasOwnProperty(fields[j].acbox__Field_API_Name__c) &&
            this.sObjects[fields[j].acbox__Field_API_Name__c] != ""
          ) {
          }
        }
      }
      var childSedtionDetails;
      for (var i = 0; i < this.sectionDetails.length; i++) {
        if (this.sectionDetails[i].section.acbox__Is_Child__c) {
          this.parentObjectFieldName =
            this.sectionDetails[i].section.acbox__Parent_Object_Field__c;
          this.childObjectName =
            this.sectionDetails[i].section.acbox__Child_Object_Name__c;
          for (let j = 0; j < this.sectionDetails[i].sectionDetails.length; j++) {
            let childSectionDetails = this.sectionDetails[i].sectionDetails[j];
          }
          childSedtionDetails = this.sectionDetails[i];
          this.childObjectInstance = Object.assign(
            {},
            JSON.parse(JSON.stringify(this.sectionDetails[i]))
          );
        }
      }
      if (result.responseChild) {
        for (var i = 0; i < result.responseChild.length; i++) {
          let objectInstance = JSON.parse(JSON.stringify(childSedtionDetails));
          let sectionDetails = objectInstance.sectionDetails;
          for (let s = 0; s < sectionDetails.length; s++) {
            let field = sectionDetails[s];
            objectInstance.sectionDetails[s].acbox__Default_Value__c = result.responseChild[i][field.acbox__Field_API_Name__c] ?
              result.responseChild[i][field.acbox__Field_API_Name__c] : '';
          }
          objectInstance.Id = result.responseChild[i].Id;
          objectInstance.count = i + 1;
          this.sectionDetailsChild.push(objectInstance);
          this.listChild.push({
            sobjectType: this.childObjectName,
            Id: objectInstance.Id
          });
        }
        if (result.responseChild.length == 0 && this.menutext == "Day Pass") {
          var initialValue = Object.assign(
            {},
            JSON.parse(JSON.stringify(this.childObjectInstance))
          );
          initialValue.count = 1;
          this.sectionDetailsChild.push(initialValue);
          this.listChild.push({ sobjectType: this.childObjectName });
        }
      }
      if (this.serviceRequestId != "") {
        this.refreshValues();
      }
      if (this.serviceReq) this.serviceReq.slice();
      this.showSpinner = false;
    } else {
      this.showSpinner = false;
    }
  }
  get hidebutton() {
    return this.listChild.length == 1 && this.menutext == "Day Pass"
      ? false
      : true;
  }
  getDateFromHours(time) {
    time = time.split(":");
    let now = new Date();
    return new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      ...time
    ).getTime();
  }
  processValidationDetails(field, hasError, errorMessage, fieldValue) {
    for (var i = 0; i < this.sectionDetails.length; i++) {
      for (var j = 0; j < this.sectionDetails[i].sectionDetails.length; j++) {
        if (
          field ==
          this.sectionDetails[i].sectionDetails[j].acbox__Field_API_Name__c
        ) {
          this.sectionDetails[i].sectionDetails[j].acbox__Default_Value__c =
            fieldValue;
          this.sectionDetails[i].sectionDetails[j].hasError = hasError;
          this.sectionDetails[i].sectionDetails[j].errorMessage = errorMessage;
        }
      }
    }
  }
  processMultiValidationDetails(
    field,
    hasError,
    errorMessage,
    fieldValue,
    indexData
  ) {
    for (
      var j = 0;
      j < this.sectionDetailsChild[indexData].sectionDetails.length;
      j++
    ) {
      if (
        field ==
        this.sectionDetailsChild[indexData].sectionDetails[j]
          .acbox__Field_API_Name__c
      ) {
        this.sectionDetailsChild[indexData].sectionDetails[
          j
        ].acbox__Default_Value__c = fieldValue;
        this.sectionDetailsChild[indexData].sectionDetails[j].hasError =
          hasError;
        this.sectionDetailsChild[indexData].sectionDetails[j].errorMessage =
          errorMessage;
      }
    }
  }
  async refreshValues() {
    await notifyRecordUpdateAvailable([{ recordId: this.serviceRequestId }]);
  }
  handleFormCancel(event){
    this.showShareHoldersForm = false;
    this.shareHolderSelectedValue = 'Individual';
    this.validationMessage = '';
    this.validationErrorMessage = '';
    this.connectedCallback();
    event.stopPropagation();
  }
  removeDuplicateRoles(originalString) {
    let stringArray = originalString.split(';');
    let uniqueArray = [...new Set(stringArray)];
    let uniqueString = uniqueArray.join(';');
    return uniqueString;
  }
  async handleFormSubmit(event) {
    this.showSpinner = true;
    this.hasError = false;
    this.validationMessage = '';
    this.validationErrorMessage = '';
    let fields = [];
    let validation = { validity: true, flowId: this.currentFlowId };
    console.log('this.uploadedFileName--->'+this.documentName);
    if (!this.stopNavigation) {
      this.template
        .querySelectorAll("lightning-input-field")
        .forEach((element) => element.reportValidity());
      let isValid = this.validateFields();
      if (!isValid) {
        this.showSpinner = false;
        return;
      }
      let isInputFieldValid = this.validateInputFields();
      if(!isInputFieldValid) {
        this.showSpinner = false;
        return;
      }
      let totalUBOPercentage = 0;
      this.shareHoldersData.forEach(item => {
        if(item.Role__c.includes('UBO')){
          console.log('item.Status_of_BO_Ownership__c--->'+item.Status_of_BO_Ownership__c);
          if(this.selectedMemberList !=null){
            if(item.Id != this.selectedMemberList[0].Id)
            totalUBOPercentage = totalUBOPercentage+item.Status_of_BO_Ownership__c;
          }else{
            totalUBOPercentage = totalUBOPercentage+item.Status_of_BO_Ownership__c;
          }
        }
      })
      this.uboOwnershipPercentage = totalUBOPercentage;
      console.log('this.uboOwnershipPercentage--->'+this.uboOwnershipPercentage);
      var sectionsUpdated = [];
      console.log('selectedMemberList::'+JSON.stringify(this.selectedMemberList));
      console.log('sectionDetails::'+JSON.stringify(this.sectionDetails));
      for (var i = 0; i < this.sectionDetails.length; i++) {
          if (this.sectionDetails[i].section.acbox__Is_Child__c) {
          fields = this.sectionDetails[i].sectionDetails;
          for (var j = 0; j < fields.length; j++) {
            let fieldVal;
            if(this.sObjects.hasOwnProperty(fields[j].acbox__Field_API_Name__c)){
              fieldVal = this.sObjects[fields[j].acbox__Field_API_Name__c];
              if(
                fieldVal &&
                typeof fieldVal === "string" &&
                fields[j].acbox__Field_type__c === "Text"
              ) {
                this.sObjects[fields[j].acbox__Field_API_Name__c] =
                  fieldVal.toUpperCase();
              }
            }else{
              let target = this.template.querySelector(`[data-id="${fields[j].acbox__Field_API_Name__c}"]`);
              if(target != null){
                fieldVal = target.value();
                this.sObjects[fields[j].acbox__Field_API_Name__c] =
                  fieldVal &&
                    typeof fieldVal === "string" &&
                    fields[j].acbox__Field_type__c === "Text"
                    ? fieldVal.toUpperCase()
                    : fieldVal;
              }
            }
            if(fieldVal !=null && fieldVal != ""){
              if(fields[j].acbox__Field_API_Name__c == 'Date_Of_Birth__c' && this.formName != 'Add Shareholders'){
                let isDOBValid =  this.handleDOBvalidation(fieldVal);
                 if(!isDOBValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Age must be above 18 years.";
                 }
                let isDOBHistoric =  this.validateDatehistoric(fieldVal);
                 if(!isDOBHistoric){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Historic dates are not acceptable.";
                 }
              }
              if(fields[j].acbox__Field_API_Name__c == 'Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c'){
                let isPPExpiryDateValid =  this.validatePassportExpiry(fieldVal);
                 if(!isPPExpiryDateValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Expiry Date should be more than 6 months.";
                 }
                 let isPPExpiryDateHistoric =  this.validateDatehistoric(fieldVal);
                 if(!isPPExpiryDateHistoric){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Historic dates are not acceptable.";
                 }
              }
              if(fields[j].acbox__Field_API_Name__c == 'Passport_Issued_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c'){
                let isPPIssueDateValid =  this.validatePassportIssueDate(fieldVal);
                 if(!isPPIssueDateValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Issue Date can't be a future date.";
                 }
                 let isPPIssueDateHistoric =  this.validateDatehistoric(fieldVal);
                 if(!isPPIssueDateHistoric){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Historic dates are not acceptable.";
                 }
              }
              if(fields[j].acbox__Field_API_Name__c == 'Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Number__c'  || fields[j].acbox__Field_API_Name__c == 'POC_Passport_Number__c'){
                let isPassportNumberValid =  this.validatePassportNumber(fieldVal);
                 if(!isPassportNumberValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Please enter only alphanumeric, Special characters are not allowed.";
                 }
              }
              if(fields[j].acbox__Field_API_Name__c == 'Place_Of_Birth__c'){
                let isPlaceOfBirthValid =  this.validatePlaceOfBirth(fieldVal);
                 if(!isPlaceOfBirthValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Please enter only alphanumeric and whitespace, Special characters are not allowed.";
                 }
              }
              if(fields[j].acbox__Field_API_Name__c == 'Primary_Mobile_Number__c'){
                let isMobileNumberValid =  this.validateMobileNumber(fieldVal);
                 if(!isMobileNumberValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Please enter mobile number in given format '+971XXXXXXXXX'.";
                 }
              }
              if(fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c'){
                let isEIDValid =  this.validateEmiratesId(fieldVal);
                if(!isEIDValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Please enter valid Emirates Id in given format '784-XXXX-XXXXXXX-X'.";
                 }
              } 
              if(fields[j].acbox__Field_API_Name__c == 'License_Issue_Date__c'){
                let isEIDValid =  this.validateLicenseIssueDate(fieldVal);
                if(!isEIDValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Issue Date can't be a future date.";
                 }
              }  
              if(fields[j].acbox__Field_API_Name__c == 'License_Expiry_Date__c'){
                let isEIDValid =  this.validateLicenseExpiryDate(fieldVal);
                if(!isEIDValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Expiry Date can't be a past date.";
                 }
              }  
              if(fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c'){
                let isValid =  this.validateStatusOfBOOwnership(fieldVal);
                if(!isValid){
                   fields[j].hasError = true;
                   validation.validity = false;
                   fields[j].errorMessage = "Ownership % should not exceed 100";
                 }
              }           
            }
          }
        }
      } 
    }
      if(this.formName == 'Add Board Members'){
        if(this.sObjects['Is_Manager__c'] == false && this.sObjects['Is_Director__c'] == false && this.sObjects['Is_Secretary__c'] == false){
          this.hasError = true;
          this.validationMessage = 'Please select atleast one board member role.';
          this.showSpinner = false;
          return;
     }
      }
     if(this.isSelectedUBOType && !this.contentVersionId && !this.uploadedFileName && !this.skipDocUpload && !this.isExceptionUBO){
       this.hasError = true;
       if(this.isCorporateShareholder)
        this.validationMessage = 'Please upload license copy';
       else 
        this.validationMessage = 'Please upload passport copy';
        this.showSpinner = false;
        return;
     }
     console.log('recId---->'+this.serviceRequestId+'---role--->'+this.sObjects['Role__c']+'---passportNumber--->'+this.sObjects['Passport_Number__c']+'---amendmentId--->'+this.sObjects['Id']);
     if(this.sObjects['Passport_Number__c'] != ''){
      this.duplicatecheck = await duplicateRecordCheck({recId: this.serviceRequestId, role: this.sObjects['Role__c'], passportNumber: this.sObjects['Passport_Number__c'], amendmentId: this.sObjects['Id']})
      console.log('this.duplicatecheck---->'+this.duplicatecheck);
      if(this.duplicatecheck == true){
          this.showSpinner = false;
          this.hasError = true;
          this.validationErrorMessage = "There is an already user exist with same passport number.";
        return;
      }
     }
     let totalUBOOwnership = parseFloat(this.uboOwnershipPercentage)+parseFloat(this.uboPercentage);
      console.log('totalUBOOwnership--->'+totalUBOOwnership);
      if(totalUBOOwnership > 100){
        this.showSpinner = false;
        this.hasError = true;
        this.validationErrorMessage = "Please ensure that the total Status of BO Percentage across all UBOs does not exceed 100%.";
        return;
     }
     console.log('validation.validity --->'+validation.validity);
     console.log('this.stopNavigation --->'+this.stopNavigation);
     if (validation.validity || this.stopNavigation) {
      this.sObjects["Action_Template__c"] = this.actionTempId;
      if (this.serviceRequestId != "") {
        this.sObjects["Id"] = this.serviceRequestId;
      }
    try {
    for (var i = 0; i < this.listChild.length; i++) {
      this.listChild[i].sobjectType = this.childObjectName;
    }
    this.showShareHoldersForm = false;
    this.showPersonalInfo = false;
    this.showUBOTypeSection = false;
    console.log('this.obrecordId--->'+this.obrecordId);
    if (this.obrecordId !== undefined && this.obrecordId != '') {
      this.sObjects['Id'] = this.obrecordId;
    }else{
      delete this.sObjects['Id'];
      this.sObjects['Role__c'] = '';
    }
    if (this.formHeader !== undefined && this.formHeader != '') {
        this.sObjects['Status__c']='New';
      console.log('sobject 1111--->'+JSON.stringify(this.sObjects));
      console.log('role 1111---->'+this.sObjects['Role__c']);
      if(this.formName == 'Add Shareholders'){
        let roleStr = '';
        if(this.shareHolderSelectedValue == 'Individual'){
          roleStr = 'Shareholder;';
          if(this.sObjects['Is_Manager__c'] == true){
              roleStr = roleStr + 'Manager;';
          }
          if(this.sObjects['Is_Director__c'] == true){
              roleStr = roleStr + 'Director;';
          }
          if(this.sObjects['Is_Secretary__c'] == true){
              roleStr = roleStr + 'Secretary;';
          }
          if(this.sObjects['Is_UBO__c'] == true){
              roleStr = roleStr + 'UBO;';
          }
          roleStr = roleStr.slice(0, -1);     
          this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
        }else if(this.shareHolderSelectedValue == 'Corporate'){
          roleStr = 'Shareholder;';
          if(this.sObjects['Is_UBO__c'] == true){
              roleStr = roleStr + 'UBO;';
            }
            roleStr = roleStr.slice(0, -1); 
          this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
        }
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
      if(this.formName == 'Add Board Members'){
        let roleStr = '';
        if(this.sObjects['Role__c'] !=null){
          if(this.sObjects['Is_Director__c'] == true){
            roleStr = roleStr + 'Director;';
          }else{
            roleStr = roleStr.replace('Director;', '');
            this.sObjects['Role__c'] = this.sObjects['Role__c'].replace('Director', '');
          }        
          if(this.sObjects['Is_Secretary__c'] == true){
            roleStr = roleStr + 'Secretary;'; 
          }else{
            roleStr = roleStr.replace('Secretary;', '');
            this.sObjects['Role__c'] = this.sObjects['Role__c'].replace('Secretary', '');
          }
          if(this.sObjects['Is_Manager__c'] == true){
            roleStr = roleStr + 'Manager;';
          }else{
            roleStr = roleStr.replace('Manager;', '');
            this.sObjects['Role__c'] = this.sObjects['Role__c'].replace('Manager', '');
          }
          roleStr = roleStr.slice(0, -1); 
          console.log('this.sObjects role 222 ----> '+this.sObjects['Role__c']);
          console.log('roleStr 222--->'+roleStr);
          if(this.sObjects['Role__c'] !=null){
            roleStr = this.sObjects['Role__c']+';'+roleStr;
          }
        }else{
          if(this.sObjects['Is_Director__c'] == true){
            roleStr = roleStr + 'Director;';
          }      
          if(this.sObjects['Is_Secretary__c'] == true){
            roleStr = roleStr + 'Secretary;'; 
          }
          if(this.sObjects['Is_Manager__c'] == true){
            roleStr = roleStr + 'Manager;';
          }
          roleStr = roleStr.slice(0, -1); 
        }
        this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
      if(this.formName == 'Add POA'){
        this.sObjects['Role__c'] = 'Contact Person';
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
      if(this.formName == 'Add General Manager'){
        this.sObjects['Role__c'] = 'Manager';
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
      if(this.formName == 'Add UBO'){
        let roleStr = '';
        if(this.sObjects['Role__c'] !=null){
          console.log('inside loop');
          roleStr = this.sObjects['Role__c']+';'+'UBO';
        }else{
          roleStr = 'UBO';
        }
        this.sObjects['Role__c'] =this.removeDuplicateRoles(roleStr);
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
      if(this.formName == 'Add Secretary'){
        this.sObjects['Role__c'] = 'Secretary';
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
      if(this.formName == 'Add Legal Representative'){
        this.sObjects['Role__c'] = 'Legal Representative';
        this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
      }
    }
    console.log(JSON.stringify(this.sObjects));
        createsObjectRecord({ record: this.sObjects, contentVersionId: this.contentVersionId })
        .then(response => {
          this.sectionDetails = [];
          this.showPersonalInfo = false;
          this.showUBOTypeSection = false;
          this.connectedCallback();
        })
        .catch(error => {
          console.error('Error: ', error);
          this.showPersonalInfo = false;
          this.showUBOTypeSection = false;
        });
      } catch (error) {
        this.showSpinner = false;
        validation.validity = false;
        validation.error = error;
      }
    } else {
      validation.validity = false;
      this.showSpinner = false;
      validation.error = "Please verify all field on application.";
    }
    console.log('validation--->'+JSON.stringify(validation));
    return validation;
  }
  handleUploadFinished(event) {
    this.validationMessage = '';        
    const uploadedFiles = event.target.files;
    if(this.shareHolderSelectedValue == 'Individual'){
       this.showPPSpinner = true; 
    }else{
       this.showSpinner1 = true; 
    }
    const file = uploadedFiles[0];
    const fileSizeLimit = 2 * 1024 * 1024; 
    if(file.size > fileSizeLimit){
      alert("File size exceeds 2MB limit. Please choose a smaller file.");
      this.showPPSpinner = false;  
      this.showSpinner1 = false; 
      event.target.value=null;
      return;
    }
    const reader = new FileReader();
    if(file) {
      reader.onloadend = this.handleFileRead.bind(this);
      reader.readAsDataURL(file);
    }
    const contentDocumentId = uploadedFiles[0].documentId;
    const fileName = uploadedFiles[0].name;
    if(this.isCorporateShareholder || this.isExceptionUBO)
     this.uploadedFileName = 'TradeLicenseCopy';
     else
     this.uploadedFileName = 'PassportCopy';  
    console.log(contentDocumentId);
    console.log('this.uploadedFileName--->'+this.uploadedFileName);
    this.upload(file); 
  }
   handleFileRead(event) {
        const reader = event.target;
        this.fileUpHyperlink = reader.result;
    }
  async upload(file) {
    const content = await this.readFileAsync(file);
    console.log('this.uploadedFileName---->'+this.uploadedFileName);
    const fileName = this.uploadedFileName+'.'+file.name.split('.').pop(); 
    console.log('fileName--->'+fileName);
    this.documentName = fileName;
    const recordInput = {
      apiName: 'ContentVersion',
      fields: {
        Title: fileName,
        PathOnClient: '/' + fileName,
        VersionData: content 
      }
    };
    try {
      const result = await createRecord(recordInput);
      console.log('content version result---->'+JSON.stringify(result));
      this.contentVersionId = result.id;
      if (!this.isCorporateShareholder && this.contentVersionId && !this.isExceptionUBO && (this.obrecordId === undefined || this.obrecordId =='')) {
        this.showPPSpinner = true;
        getDocumentOCR({ conVersionID: this.contentVersionId }).then(response => {
          response = JSON.parse(response);
          if(response !=null){
            this.populateDataFromOCR(response);
          }
          this.showPPSpinner = false;
        })
          .catch(error => {
            console.error('Error: ', error);
            this.showSpinner = false;
            this.showPPSpinner = false;
            this.showPersonalInfo = true;
            this.showUBOTypeSection = false;
          });
      }else{
          this.showSpinner1 = false; 
          this.showPersonalInfo = true;
          this.showUBOTypeSection = false;
          this.showSpinner = false;
          this.showPPSpinner = false;
          console.log('inside else---');
          console.log('selected-->'+JSON.stringify(this.sectionDetails));
          this.sectionDetails.forEach(item => {
              if(!item.section.acbox__Type__c || item.section.acbox__Type__c == 'UBOType' || item.section.acbox__Type__c == this.shareholderType){
                  item.section.isRenderByDefault = true;
                  if(item.section.Name == 'POC Individual Details'){
                    var fields = item.sectionDetails;
                    for(var j = 0; j < fields.length; j++) {
                      if(fields[j].acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c'){
                          fields[j].isRenderByDefault = true;
                        }                 
                      }
                  }
              }else{
                  item.section.isRenderByDefault = false;
              }
          })
      } 
    } catch (error) {
      console.log(error.body.message);
    }
  }
  readFileAsync(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
      reader.readAsDataURL(file);
    });
  }
 getRelatedData(){
      let relatedRecords = [];
      return getRelatedRecords({onboardRecordId: this.serviceRequestId})
       .then(result => {
          result.forEach((item) => {
            console.log('item--->'+item);
            relatedRecords.push({
              dataFor: "action",
              status: 'New',
              recId: item.Id,
              passportNumber: item.Passport_Number__c,
              serviceRequestID:  this.serviceRequestId,
              actionTemplateId: this.actionTempId,
              componentName: this.formTemplatetitle,
              btnTitle : "Add Member",
              showDeleteBtn: false,
              showEditBtn : false,
              showSelectBtn : true,
              selectBtnLbl : "Add Member",
              stylecss : 'flex: 0 0 10%;',
              values: [
                {
                  text: item.Full_Name__c,
                  isDate: false,
                  isNumber: false,
                  isText: true,
                  stylecss : 'flex: 0 0 30%;',
                },
                {
                  text: item.Passport_Number__c,
                  isDate: false,
                  isNumber: false,                
                  isText: true,
                  stylecss : 'flex: 0 0 30%;',
                },
                {
                  text: item.Role__c.includes('Manager') ? item.Role__c.replace('Manager', 'General Manager') : item.Role__c,
                  isDate: false,
                  isNumber: false,
                  isText: true,
                  stylecss : 'flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;',
                }
              ],
            });
        });
        return relatedRecords;
       })
       .catch(error => {
        console.error('Error calling Apex method:', error);
      });
  }
 getSelectedRelationInfo(){
    let existingRecords = [];
    this.accId = this.serviceRequestRecord.Account_Name__c;
     return getSelectedRelationInfo({relationId: this.accId})
       .then(result => {
          result.forEach((item) => {
            existingRecords.push({
              dataFor: "action",
              status: 'Active',
              recId: item.Id,
              passportNumber: item.Passport_Number__c,
              serviceRequestID:  this.serviceRequestId,
              actionTemplateId: this.actionTempId,
              componentName: this.formTemplatetitle,
              btnTitle : "Add Member",
              showDeleteBtn: false,
              showEditBtn : false,
              showSelectBtn : true,
              selectBtnLbl : "Add Member",
              stylecss : 'flex: 0 0 10%;',
              values: [
                {
                  text: item.Full_Name__c,
                  isDate: false,
                  isNumber: false,
                  isText: true,
                  stylecss : 'flex: 0 0 30%;',
                },
                {
                  text: item.Passport_Number__c,
                  isDate: false,
                  isNumber: false,                
                  isText: true,
                  stylecss : 'flex: 0 0 30%;',
                },
                {
                  text: item.Role__c == 'Manager' ? 'General Manager' : item.Role__c,
                  isDate: false,
                  isNumber: false,
                  isText: true,
                  stylecss : 'flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;',
                }
              ],
            });
        });
        console.log('existingRecords--->'+existingRecords);
        return existingRecords;
       })
       .catch(error => {
        console.error('Error calling Apex method:', error);
      });
 }
   getFromData() {
    this.showSpinner = true;
    getExistingShareHoldersData({ onboardRecordId: this.serviceRequestId, role: this.formRole })
      .then(result => {
        console.log('Result--->'+JSON.stringify(result));
        if(result !=null){
        this.existingData = result;
        if(this.formName == 'Add Shareholders'){
          this.addBtnlabel = 'Add Shareholder';
          this.dataTableName = 'Shareholders';
          this.shareHoldersData = result;
          console.log('shareHoldersData--->'+this.shareHoldersData);
          if(this.shareHoldersData.length === 0) {
            this.showShareHoldersForm = true;
          } else {
            this.showShareHoldersForm = false;
            this.showPersonalInfo = false;
            this.UBOTypeSection = false;
          }
        }
         else if (this.formName == 'Add Board Members') {
          this.addBtnlabel = 'Add Board Members';
          this.dataTableName = 'Board Members';
          console.log(JSON.stringify(result));
          this.directorsData = result;
          if(result.length > 0) {
            this.showShareHoldersForm = false;
          } else {
            this.showShareHoldersForm = true;
          }
          this.shareHoldersData = [];
        }
         else if(this.formName == "Add UBO"){
          this.dataTableName = 'Ultimate Beneficiary Owner';
          this.addBtnlabel = 'Add UBO';
          console.log(JSON.stringify(result));
          this.directorsData = result;
           if (result.length > 0) {
            this.showShareHoldersForm = false;
          } else {
            this.showShareHoldersForm = true;
          }
          this.shareHoldersData = [];
        }
      if(this.directorsData.length>0){
        this.uboMembersData = [];
        this.directorsData.forEach((item) => {
        this.uboMembersData.push({
          dataFor: "action",
          status: item.Status__c,
          recId: item.Id,
          role: item.Role__c,
          relAccId : item.Relationship_Account__c,
          serviceRequestID:  this.serviceRequestId,
          actionTemplateId: this.actionTempId,
          componentName: this.formTemplatetitle,
          btnTitle : "Edit details",
          showEditBtn : (item.Status__c == 'Remove' || item.Status__c == 'Existing') ? false :  true,
          showDeleteBtn: true,
          deletBtnLbl : 'Remove from Amendments',
          eidtBtnLbl : 'Edit Details',
          stylecss : 'flex: 0 0 10%;',
          values: [
            {
              text: item.Full_Name__c, 
              isDate: false,
              isNumber : false,
              isText : true,
              rowStatusClass: "",
              stylecss : 'flex: 0 0 20%;',
            },
            {
              text: item.Owner_Type__c,
              isDate: false,
              isNumber : false,
              isText : true,
              rowStatusClass: "",
              stylecss : 'flex: 0 0 15%;',
            },
            {
              text: item.Status_of_BO_Ownership__c != null ? item.Status_of_BO_Ownership__c+' %' : '', 
              isDate: false,
              isNumber : false,
              isText : true,
              rowStatusClass: "",
              stylecss : 'flex: 0 0 10%;',
            },
            {
              text: this.formattedRoles(item.Role__c),
              isDate: false,
              isNumber : false,
              isText : false,              
              isHTML : true, 
              rowStatusClass: "",
              stylecss : 'flex: 0 0 30%;  max-width: 200px;', 
              cssClassForHtmlVal:'cssCls-' +item.Id, 
            },
            {
              text: item.Owner_Type__c == 'Individual' ? item.Passport_Number__c : item.Registration_Number__c, 
              isDate: false,
              isNumber : false,
              isText : true,
              rowStatusClass: "",
              stylecss : 'flex: 0 0 15%;',
            },
            {
              text: item.Status__c,
              isDate: false,
              isNumber : false,
              isText : true,
              rowStatusClass: "",
              stylecss : 'flex: 0 0 10%;',
            }
          ],
        });
      });
      console.log('shareHolderMembersData::'+JSON.stringify(this.shareHolderMembersData));
    }
    }
    this.showSpinner = false;
    })
    .catch(error => {
      this.showSpinner = false;
      console.error('Error calling Apex method:', error);
    });
  }
  formattedRoles(role) {
    if (!role) {
        return ''; 
    }
    const roles = role.split(';').map((item) =>
        item.includes('Manager') ? item.replace('Manager', 'General Manager') : item
    );
    return `
        <ul>
            ${roles.map((role) => `<li>${role}</li>`).join('')}
        </ul>
    `;
}
async handleRowAction(event) {
  console.log('handleRowAction section details--->'+this.sectionDetails);
  this.showSpinner = true;
  this.validationErrorMessage = '';
  const action = event.detail.eventStatus;
  const recid = event.detail.recId;
  this.skipDocUpload = false;
  const status = event.detail.recStatus;
  const role = event.detail.role;
  this.rolePicklistOptions = [];
  console.log('role::'+role);
  this.contentVersionId = '';
  this.uploadedFileName = '';
  let shareHolderData = [];
  console.log('event.detail::'+JSON.stringify(event.detail));
  console.log('action::'+action);
  if (action === 'edit_details'  ) { 
    console.log('isUpdateForm::'+this.isUpdateForm);
    console.log('status::'+status);
    if(status == 'Active'){
      this.obrecordId = '';
      console.log('relAccId::'+ event.detail.relAccId);
     this.relAccountId = event.detail.relAccId; 
     this.relId = event.detail.recId;
     await getSelectedRelationInfo({ relationId: this.accId })
        .then(result => {
				   shareHolderData = result;
           this.selectedMemberList = result;
           console.log('selectedMemberList::'+ JSON.stringify(shareHolderData));
				  })
          .catch(error => {
              console.error('Error calling Apex method:', error);
           });
    }else if(status == 'New'){
      this.isNotDACCRegistered = false;
      this.skipDocUpload = true;
      this.obrecordId = '';
      this.relAccountId = event.detail.relAccId; 
      this.relId = event.detail.recId;
      await getSelectedAmendementInfo({ relationId: recid })
        .then(result => {
           this.skipDocUpload = true;
           this.obrecordId = recid;
				   shareHolderData = result;
           this.selectedMemberList = result;
           console.log('selectedMemberList::'+ JSON.stringify(shareHolderData));
				  })
          .catch(error => {
              console.error('Error calling Apex method:', error);
           });
    }
    if(this.selectedMemberList && this.selectedMemberList.length > 0){
     this.shareholderType = this.selectedMemberList[0].Owner_Type__c;
     this.shareHolderSelectedValue = this.selectedMemberList[0].Owner_Type__c;
     this.sObjects['Owner_Type__c'] = this.selectedMemberList[0].Owner_Type__c;
     this.contentVersionId = this.selectedMemberList[0].Content_Version_Id__c !='' ? this.selectedMemberList[0].Content_Version_Id__c : '';
     this.sectionDetails.forEach(item => { 
      if(this.formName == 'Add UBO'){
          if(!item.section.acbox__Type__c || item.section.acbox__Type__c == 'UBOType' || item.section.acbox__Type__c == this.shareholderType){
              item.section.isRenderByDefault = true;
              if(item.section.Name == 'POC Individual Details'){
                    var fields = item.sectionDetails;
                    for(var j = 0; j < fields.length; j++) {
                      if(fields[j].acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c'){
                          fields[j].isRenderByDefault = true;
                        }                 
                      }
                  }
            }else{
                item.section.isRenderByDefault = false;
            }
      }
     })
    }
    let s = JSON.stringify(this.sectionDetails);
    let k = JSON.parse(s); 
    var sobj = {};
    Object.keys(this.sObjects).forEach(key => {
      sobj[key] = this.sObjects[key];
    });
    console.log('sobj--->'+JSON.stringify(sobj));
    var isVisitedUAEBefore= false;
    var isUAEResident= false;
    var isPoliticalExposed = false;
    var isDualNationality = false;
    var docURL = '';
    var docName = '';
    let isPEPOther = false;
    let isCustodian = true;
    let isStockExchangeException = false;
    let isGovException = false;
    k.forEach(function (el) {
      el.sectionDetails.forEach(function (fl) {        
        shareHolderData.forEach(function (dt) {
         if((status == 'Active' || status == 'New' || dt.Id === recid) && dt[fl.acbox__Field_API_Name__c] !== undefined) {
            if(dt['Document_Link__c'] !== undefined){
              docURL = dt['Document_Link__c'];
            }
            if(dt['Document_Name__c'] !== undefined){
              docName = dt['Document_Name__c'];
            }
            fl.acbox__Default_Value__c = dt[fl.acbox__Field_API_Name__c];
            if(status != 'Active'){
              fl['Id'] = recid;
              sobj['Id'] = recid;
            }
            sobj[fl.acbox__Field_API_Name__c] = dt[fl.acbox__Field_API_Name__c];
            sobj['Role__c'] = dt['Role__c'];
            sobj['Owner_Type__c'] = dt['Owner_Type__c'];
            if(fl.acbox__Field_API_Name__c == 'Have_you_visited_the_UAE_before__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes' && dt['Owner_Type__c'] == 'Individual'){
              isVisitedUAEBefore = true;              
            }else if(fl.acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes'){
              isUAEResident = true;              
            }else if(fl.acbox__Field_API_Name__c == 'Are_you_a_Politically_Exposed_Person__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes'){
              isPoliticalExposed = true;
            }else if(fl.acbox__Field_API_Name__c == 'Do_you_have_dual_Nationality__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes'){
              isDualNationality = true;
            }else if(fl.acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c' && dt[fl.acbox__Field_API_Name__c] == 'Other'){
              isPEPOther = true;
            }else if(fl.acbox__Field_API_Name__c == 'Are_you_the_custodian__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes'){
              isCustodian = true;
            }else if(fl.acbox__Field_API_Name__c == 'Exception_Company_Type__c' && dt[fl.acbox__Field_API_Name__c] == 'A subsidiary or branch of company listed in a recognized stock exchange'){
              isStockExchangeException = true;
            }else if(fl.acbox__Field_API_Name__c == 'Exception_Company_Type__c' && dt[fl.acbox__Field_API_Name__c] == 'A subsidiary or branch of a government owned entity'){
              isGovException = true;
            }
          }
        })
      })
    })
    k.forEach(function (el){
       el.sectionDetails.forEach(function (fl) {
          if(isVisitedUAEBefore == true && (fl.acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c' || fl.acbox__Field_API_Name__c == 'In_Out__c')){
              fl.isRenderByDefault = true;
          }else if(isUAEResident == true && fl.acbox__Field_API_Name__c == 'Emirates_ID__c'){
              fl.isRenderByDefault = true;
          }
          else if(isPoliticalExposed == true && fl.acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c'){
              fl.isRenderByDefault = true;
          }
          else if(isDualNationality == true && (fl.acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c'
                    || fl.acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c' || fl.acbox__Field_API_Name__c == 'Secondary_Passport_Issuing_country__c'
                    || fl.acbox__Field_API_Name__c == 'Secondary_Passport_Number__c' || fl.acbox__Field_API_Name__c == 'Secondary_Place_Of_Issue__c')){
              fl.isRenderByDefault = true;
          }else if(isPEPOther && fl.acbox__Field_API_Name__c == 'PEP_Other__c'){
                fl.isRenderByDefault = true;
          }else if(isCustodian == false && fl.acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c'){
              fl.isRenderByDefault = true;
          }else if(isStockExchangeException == true && fl.Name == 'Stock Exchange'){
            fl.isRenderByDefault = true;
          }else if(isGovException == true && fl.Name == 'Government Entity Name'){
            fl.isRenderByDefault = true;
          }
       })
    });
    this.documentURL = docURL;
    this.documentName = docName;
    if(this.isNotDACCRegistered == true)
    this.uploadedFileName = docName;
    this.sectionDetails = k;
    Object.keys(sobj).forEach(key => {
      this.sObjects[key] = sobj[key];
    });
    this.showShareHoldersForm = true;
    this.showPersonalInfo = true;
    this.showUBOTypeSection = false;
    this.closeModal();
    this.closeModalExisting();
     if(action.name === 'select_details'){
       this.obrecordId = '';
       this.closeModal();
       this.closeModalExisting();
    }
  }
  else if (action == 'delete_details') {
    if(status=='New' || status=='Existing' || status=='Remove'){
      this.confirmationMessage =
      "Are you sure? This action will delete the record.";
      this.isDialogVisible = true;
      console.log("Delete Request By Sai in Company");
      this.delRecordId =recid;
    }
    else if(status=='Active'){
       this.confirmationMessage =
      "Are you sure? This action will remove the applicant's record.";
      this.isDialogVisibleGen = true;
      console.log("Delete Request By Sai in Company for Director");
      this.delRecordId =recid;
    }
  }
  else if(action == 'select_details'){
    console.log('event checked:'+event.detail.checked);
     var isMemSelected = event.detail.checked;
     if(isMemSelected && this.selectedMembers.indexOf(event.detail.recId)==-1)
      this.selectedMembers.push(event.detail.recId);
     else if(!isMemSelected && this.selectedMembers.indexOf(event.detail.recId)!=-1){
       this.selectedMembers = this.selectedMembers.filter(elem => elem !== event.detail.recId);
     } 
  }
}
addAdditionalShareHolder() {
  this.showShareHoldersForm = true;
  this.showPersonalInfo = true;
  this.obrecordId = '';
  this.uploadedFileName = '';
  this.shareholderType = '';
  delete this.sObjects['Id'];
}
handleShareHolderChange(event) {
  this.isShareholderSel = true;
  this.shareHolderSelectedValue = event.target.value;
  this.shareholderType = event.target.value;  
  this.uploadedFileName = '';
  this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
  this.helpText = `Please upload a clear, coloured scan of Applicant’s passport pages displaying personal details. Please ensure that your passport is valid for atleast 
                            six months from the date of submission. The maximum file size allowed is 2mb and accepted file formats are ".pdf,.jpeg,.jpg".`;
  if(this.shareHolderSelectedValue == 'Corporate'){
    this.documentText = 'Upload a License Copy';
    this.helpText = 'Please upload company Trade License copy.';
  }else{
    this.documentText = 'Upload a Passport Copy';
  }
  console.log('sobject---->'+JSON.stringify(this.sObjects));
  this.showPersonalInfo = false;
  if(this.formTemplatetitle == 'Add Shareholders'){
    this.isShareHolderPage = true;
    if(this.shareHolderSelectedValue == 'Individual'){
        this.isDACCRegistered = false;
        this.hideDACCDropdown = false;
        this.isNotDACCRegistered = true;       
    }else if(this.shareHolderSelectedValue == 'Corporate'){
        this.isDACCRegistered = false;
        this.hideDACCDropdown = true;
        this.isNotDACCRegistered = false;
    }
  }
  for(var i = 0; i < this.sectionDetails.length; i++) {    
    if(!this.sectionDetails[i].section.acbox__Type__c || (this.sectionDetails[i].section.acbox__Type__c == this.shareholderType || this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue)){
      this.sectionDetails[i].section.isRenderByDefault = true;
    }else{ 
      this.sectionDetails[i].section.isRenderByDefault = false; 
    }
  }
  if(this.shareHolderSelectedValue != 'Individual'){
      this.showChoosefromExisting = false;
  }else{
     this.showChoosefromExisting = this.relatedRecordsAll.length > 0 ? true : false;
  }
}
handleRoleChange(event){
  console.log('roleSelectedValue::'+event.detail.fieldapi+':'+event.detail.value);
  console.log('roleChange:'+':dir:'+this.drRelId+':Mgr:'+this.mgrRelId+':sec:'+this.scRelId);
  this.rolePicklistOptions.forEach(function (role) {
        if(role.value == event.detail.fieldapi)
          role.checked = event.detail.value;
  });
  let roleValue = ''; 
  let dirId =  this.drRelId;
  let scId = this.scRelId;
  let mgrId = this.mgrRelId;  
  let delRecId = '';  
  console.log('rolePicklistOptions::'+JSON.stringify(this.rolePicklistOptions));  
  this.rolePicklistOptions.forEach(function (role) {
      if(role.checked == true){
        roleValue = roleValue+role.value+';';
        if(role.value == 'Director' && dirId && !delRecId.includes(dirId))
          delRecId = delRecId + dirId+';';
        if(role.value == 'Secretary' && scId && !delRecId.includes(scId))
          delRecId = delRecId + scId+';';
        if(role.value == 'Manager' && mgrId && !delRecId.includes(mgrId))
          delRecId = delRecId + mgrId+';';    
         console.log('delRecId::'+delRecId+':Rolval:'+roleValue);
      }
      else{
        roleValue = roleValue.replace(role.value+';', "");
        if(role.value == 'Director' && dirId && delRecId.includes(dirId))
          delRecId = delRecId.replace(dirId+';', "");
        if(role.value == 'Secretary' && scId && delRecId.includes(scId))
          delRecId = delRecId.replace(scId+';', "");
        if(role.value == 'Manager' && mgrId && !delRecId.includes(mgrId))
          delRecId = delRecId.replace(mgrId+';', "");   
      } 
  });  
  console.log('delRecId::'+delRecId+':Rolval:'+roleValue);
  roleValue = roleValue.slice(0, -1);  
  this.delRecordId = delRecId.slice(0, -1);              
  this.roleSelectedValue = roleValue;
  this.sObjects['Role__c'] = roleValue;
}
createOBRecord() {
  const fields = {};
  fields[OB_REQUEST.fieldApiName] = this.serviceRequestId;
  const recordInput = {
    apiName: OB_AMENDMENT.objectApiName,
    fields: fields
  };
  createRecord(recordInput).then((record) => {
    console.log(record);
    this.sObjects['Id'] = record.id;
    this.obrecordId = record.id;
  });
}
populateDataFromOCR(response) {
  this.showUBOTypeSection = false;
  this.showPersonalInfo = true;
  console.log('response--->'+JSON.stringify(response));
  this.sectionDetails.forEach(item => {
      if(!item.section.acbox__Type__c || item.section.acbox__Type__c == 'UBOType' || item.section.acbox__Type__c == this.shareholderType){
          item.section.isRenderByDefault = true;
      }else{
          item.section.isRenderByDefault = false;
      }
  })
  let s = JSON.stringify(this.sectionDetails);
  let k = JSON.parse(s);
  let sobj = {};
  for(const [key, value] of Object.entries(this.sObjects)) {
    sobj[key] = value;
  }
  if(response.FirstName && response.FirstName !==''){
    this.documentName = response.FirstName + response.LastName;
  }
  if(response.docUrl !=null){
    this.documentURL = response.docUrl;
  }
  const timezoneOffset = 4 * 60 * 60 * 1000; 
  k.forEach(function (el) {
    el.sectionDetails.forEach(function (fl) {
      if(fl.acbox__Field_API_Name__c == 'First_Name__c' && response.FirstName) {
        fl.acbox__Default_Value__c = response.FirstName;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Last_Name__c' && response.LastName) {
        fl.acbox__Default_Value__c = response.LastName;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Full_Name__c') {
        fl.acbox__Default_Value__c = response.FirstName+' '+response.LastName;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Passport_Expiry_Date__c' && response.ExpiryDate) {
        const dateObject = new Date(response.ExpiryDate);        
        const localDate = new Date(dateObject.getTime() + timezoneOffset);
        fl.acbox__Default_Value__c = localDate.toISOString().split('T')[0];
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Passport_Number__c' && response.IdentityDocumentNumber) {
        fl.acbox__Default_Value__c = response.IdentityDocumentNumber;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Place_Of_Issue__c' && response.IssuePlace) {
        fl.acbox__Default_Value__c = response.IssuePlace;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Date_Of_Birth__c' && response.DateofBirth) {
        const dateObject = new Date(response.DateofBirth);
        const localDate = new Date(dateObject.getTime() + timezoneOffset);
        fl.acbox__Default_Value__c = localDate.toISOString().split('T')[0];
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Passport_Issued_Date__c' && response.DateOfIssue) {
        const dateObject = new Date(response.DateOfIssue);
        const localDate = new Date(dateObject.getTime() + timezoneOffset);
        fl.acbox__Default_Value__c = localDate.toISOString().split('T')[0];
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Gender__c' && response.Gender) {
        fl.acbox__Default_Value__c = response.Gender;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      } else if (fl.acbox__Field_API_Name__c == 'Customer_Nationality__c' && response.Nationality) {
        fl.acbox__Default_Value__c = response.Nationality;
        sobj[fl.acbox__Field_API_Name__c] =  fl.acbox__Default_Value__c;
      }
    })
  })
  this.sectionDetails = k;
  this.sObjects = sobj;
}
  openModal() {
     this.isAmendmentModalOpen = true;
    }
    openExistingModal() {
     this.isPersonAccountModalOpen = true;
    }
    closeModal() {
        this.isModalOpen = false;
        this.isAmendmentModalOpen = false;
        this.showSpinner = false;
    }
    closeModalExisting() {
        this.isModalOpen = false;
        this.isPersonAccountModalOpen = false;
        this.showSpinner = false;
    }
    deleteFile(){
         deleteUploadedFiles({ oaRecordId: this.obrecordId })
            .then(result => {
                console.log(result);
                    this.documentURL = '';
                    this.documentName = '';
                    this.uploadedFileName = '';
            })
            .catch(error => {
                console.error('Error calling Apex method:', error);
            });
    }
  async getConfirmation(event) {
    this.showSpinner = true;
    setTimeout("", 500);
    let sObjects = { sobjectType: this.reqObjectName };
    sObjects.Id = this.serviceRequestId;
    if (event.detail !== 1) {
      if (event.detail.status === "confirm") {
        this.isDialogVisible = false;
       deleteRelatedDocuments({ reqId: this.serviceRequestId, recId: this.delRecordId })
      .then(result => {
         })
      .catch(error => {
        console.error('Error calling Apex method:', error);
      });
      deleteRecord(this.delRecordId).then(() => {
        this.delRecordId="";
        console.log('After Delete=='+this.delRecordId);
        this.connectedCallback();
      })
      .catch((error) => {
        console.log(error);
      });
      } else if (event.detail.status === "cancel") {
        this.isDialogVisible = false;
        this.showSpinner = false;
        this.delRecordId="";
        console.log('After cancel1=='+this.delRecordId);
      }
    } else {
      this.isDialogVisible = false;
      this.showSpinner = false;
      this.delRecordId="";
      console.log('After Cancel2=='+this.delRecordId);
    }
  }
   validateStatusOfBOOwnership(statofBOPercentage){
    this.uboPercentage = statofBOPercentage;
    if(statofBOPercentage){
       if(statofBOPercentage > 100){
         return false;
       }
        return true;
      }
  }
  validateEmiratesId(emiratesID){
      if(emiratesID){
       if(emiratesID.length < 18 || emiratesID.length > 18){
         return false;
       }
        return true;
      }
  }   
  validatePassportNumber(passportNumber){
      if(passportNumber){
        const pattern = /^[a-zA-Z0-9\s]*$/;
        const resp =  pattern.test(passportNumber);
        return resp;
      }
  }  
  validatePlaceOfBirth(value){
    if(value){
         const pattern = /^[a-zA-Z0-9\s]*$/;
        const resp =  pattern.test(value);
        return resp;
    }
  }
  validateMobileNumber(mobile){
      if(mobile){
        const phoneRegex = /^\+\d{3}\d{9}$/;
        const resp =  phoneRegex.test(mobile);
        console.log('resp--->'+resp);
        return resp;
      }
  }   
  handleDOBvalidation(birthdate){
      if(birthdate){
          birthdate = new Date(birthdate);
          const today = new Date();
          let age = today.getFullYear() - birthdate.getFullYear();
          const monthDiff = today.getMonth() - birthdate.getMonth();
          if(monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
              age--;
          }
          if(age < 18){
              return false;
          }
      }
      return true;
  }
  validatePassportIssueDate(issueDate){
      if(issueDate){
        issueDate = new Date(issueDate);
        const todaysDate = new Date();
        if(issueDate > todaysDate){ 
            return false;
        }
      }
      return true
  }
  validateDatehistoric(dateInput){
        dateInput = new Date(dateInput);
        if(dateInput.getFullYear() < 1700){
            return false;
        }
        return true;
    }
  validateLicenseIssueDate(issueDate){
      if(issueDate){
        issueDate = new Date(issueDate);
        const todaysDate = new Date();
        if(issueDate > todaysDate){ 
            return false;
        }
      }
      return true
  }
  validateLicenseExpiryDate(issueDate){
      if(issueDate){
        issueDate = new Date(issueDate);
        const todaysDate = new Date();
        if(issueDate < todaysDate){ 
            return false;
        }
      }
      return true
  }
  isToday(date) {  
      const now = new Date();
        return date.getDate() === now.getDate() &&
              date.getMonth() === now.getMonth() &&
              date.getFullYear() === now.getFullYear();
  }
  validatePassportExpiry(expiryDate) {
      const today = new Date().getTime();
      const expiry = new Date(expiryDate).getTime();
      const minValidExpiry = today + (1000 * 60 * 60 * 24 * 180); 
      if (expiry < minValidExpiry) {
        return false; 
      }
      return true;
    }
    handleOnChange(event){      
      this.showSpinner = true;
      if(event.target.name == 'No_of_shares__c'){
          this.NoOfShares = event.target.value;
          this.sObjects['No_of_shares__c'] = event.target.value;
      }
      if(event.target.name == 'DACC_Registered__c'){
        this.DACCAccount = event.target.value;
        this.sObjects['DACC_Registered__c'] = event.target.value;
        if(event.target.value == 'Yes'){
          this.isDACCRegistered = true;
            for(var i = 0; i < this.sectionDetails.length; i++){            
                if(!this.sectionDetails[i].section.acbox__Type__c || (this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue && this.sectionDetails[i].section.Name != 'New Corporate Details'))
                this.sectionDetails[i].section.isRenderByDefault = true; 
                else
                this.sectionDetails[i].section.isRenderByDefault = false;
            }
          this.showPersonalInfo = true;
          this.showUBOTypeSection = false;
          this.isNotDACCRegistered = false;
          this.skipDocUpload = true;
        }else{
          this.isDACCRegistered = false;
          this.isNotDACCRegistered = true;
          this.skipDocUpload = false;
          for(var i = 0; i < this.sectionDetails.length; i++){            
            if(!this.sectionDetails[i].section.acbox__Type__c || this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue)
                this.sectionDetails[i].section.isRenderByDefault = true;
                else
                this.sectionDetails[i].section.isRenderByDefault = false;
          }
          this.showPersonalInfo = false;
          this.showUBOTypeSection = false;
        }
      }  
      this.showSpinner = false;  
    }   
}