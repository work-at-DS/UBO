import { LightningElement, track, api, wire } from "lwc";
import { deleteRecord } from "lightning/uiRecordApi";
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
//import getExistingDirectorsFromAccount from '@salesforce/apex/ds_OnBoardPortalRequest.getExistingDirectorsFromAccount';
import duplicateRecordCheck from '@salesforce/apex/ds_OnBoardPortalRequest.duplicateAmendmentRecordCheck';
//import getExistingAndNewAmmendmentRecords from '@salesforce/apex/ds_OnBoardPortalRequest.getExistingAndNewAmmendmentRecords';
import getExistingAndNewAmmendmentRecordsWithRole from '@salesforce/apex/ds_OnBoardPortalRequest.getExistingAndNewAmmendmentRecordsWithRole';
import getSelectedAmendementInfo from '@salesforce/apex/ds_OnBoardPortalRequest.getSelectedAmendementInfo';
import getSelectedAccInfo from '@salesforce/apex/ds_OnBoardPortalRequest.getSelectedAccInfo';
import createAmendmentforDiretor from '@salesforce/apex/ds_OnBoardPortalRequest.createAmendmentforDiretor';
//import createAmendmentforExistingRelation from '@salesforce/apex/ds_OnBoardPortalRequest.createAmendmentforExistingRelation';
import deleteRelatedDocuments from '@salesforce/apex/ds_OnBoardPortalRequest.deleteRelatedDocuments';
import deleteUploadedFiles from '@salesforce/apex/ds_OnBoardPortalRequest.deleteUploadedFiles';
import getRelatedRecords from '@salesforce/apex/ds_OnBoardPortalRequest.getRelatedRecords';
import getSelectedRelationInfo from '@salesforce/apex/ds_OnBoardPortalRequest.getSelectedRelationInfo';
import getDocumentOCR from '@salesforce/apex/ds_OnBoardPortalRequest.getDocumentOCR';
//import getAddBoardMembersData from '@salesforce/apex/ds_OnBoardPortalRequest.getAddBoardMembersData';
import createReqDocuments from '@salesforce/apex/ds_OnBoardPortalRequest.createReqDocuments';
import createReqFee from '@salesforce/apex/ds_OnBoardPortalRequest.createReqFee';
import getAccountDetails from "@salesforce/apex/ds_OnBoardPortalRequest.getAccountDetails";
//import getRegistrationActivities from "@salesforce/apex/ds_OnBoardPortalRequest.getRegistrationActivities";
import updateBOPercentage from "@salesforce/apex/ds_OnBoardPortalRequest.updateBOPercentage";
import OB_AMENDMENT from "@salesforce/schema/OB_Amendment__c";
import OB_REQUEST from "@salesforce/schema/OB_Amendment__c.Onboard_Request__c";
import LA_OBJECT from '@salesforce/schema/OB_Amendment__c';
import OWNER_TYPE from "@salesforce/schema/OB_Amendment__c.Owner_Type__c";
import commitUboTree from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.commitUboTree';
import deleteDraftNodesForServiceRequest
  from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.deleteDraftNodesForServiceRequest';
import getCountryName
  from '@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getCountryName';



import { refreshApex } from "@salesforce/apex";

import {
  getRecord,
  getFieldValue
} from 'lightning/uiRecordApi';
import COUNTRY_NAME from '@salesforce/schema/Country__c.Name';
import ACCOUNT_NAME from '@salesforce/schema/Account.Name';
import ACCOUNT_COUNTRY_NAME from '@salesforce/schema/Account.CountryName_of_Origin__c';
import getGUID from "@salesforce/apex/ds_lex_PortalUBOTreeDiagramCntrl.getGUID";
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
import Country from "@salesforce/schema/Lead.Country";

const existingDirectorDataColumns = [
  { label: 'Name', fieldName: 'Name', type: 'text' },
  { label: 'Passport Number', fieldName: 'PassportNumber', type: 'text' },
  { label: 'Role', fieldName: 'Role', type: 'text' },
  {
    label: 'Action',
    type: 'button-icon',
    typeAttributes: {
      iconName: 'utility:delete',
      iconClass: 'slds-icon-text-error',
      name: 'delete_details',
      title: 'Delete',

    }
  },
]
/*const relatedDataColumns = [
    "Name",
    "Passport Number",
    "Role",
    "Action",
];*/
const accountFields = [ACCOUNT_NAME, ACCOUNT_COUNTRY_NAME];
const countryFields = [COUNTRY_NAME];
export default class Ds_PortalOnboardingShareholdersLwc extends LightningElement {
  @track obrecordId;
  get acceptedFormats() {
    return ['.pdf', '.png'];
  }
  isUBOTreeVisible = false;
  uboSectionDetail = [];
  uboRelationship = [];
  deletedUBOIds = [];
  uboRelationshipAfterDeleteUBO;
  //relatedDataColumns = relatedDataColumns;
  existingDirectorDataColumns = existingDirectorDataColumns;
  shareHoldersData = [];
  uboData = [];
  //sharedHoldersIndividualData = [];
  //sharedHoldersCorporateData = [];
  directorsData = [];
  membersData = [];
  shareHolderCorporatemembersData = [];
  shareHolderMembersData = [];
  selectedMemberList = [];
  selectedMembers = [];
  activeDirectorListfromAccount = [];
  removedDirectorList = [];
  ammListTemp = [];
  directorsListTemp = [];
  shareholdersListTemp = [];
  managerListTemp = [];
  secretaryListTemp = [];
  legalRepListTemp = [];
  uboListTemp = [];
  uboListIndividual = [];
  relatedDataColumns = [];
  requiredActionsHeader = [];
  sharedHoldersColumns = [];
  isAmendmentCreated = false;
  isShareholderTypeSelected = false;
  @track showShareCapital = false;
  @track shareCapital;
  uboOwnershipPercentage = 0;
  uboPercentage = 0;

  /*requiredActionsHeader = [
    "Name",
    "Passport Number",
    "Role",
    "Status",
    "Action",
  ];

  sharedHoldersColumns = [
   "Name",
   "Shareholder Type",
   "No of Shares",
   "Role",
   "Passport / Registration Number",
   "Status",
   "Action",
  ];
  */

  requestActions = [];
  amendmentRequestAction = [];
  delRecordId = "";
  relAccountId = "";
  relId = "";
  @track showChoosefromPeople = true;
  @track showChoosefromExisting = true;
  @track isDialogVisible = false;
  @track isDialogVisibleGen = false;
  @track confirmationMessage;
  @track confirmationMessageGen;
  @track noActiveAmmendment = false;
  @track isModalOpen = false;
  @track isDeleteModalOpen = false;
  showShareHoldersForm = false;
  @track isAmendmentModalOpen = false;
  @track isPersonAccountModalOpen = false;
  currentRole = '';
  accId = '';
  isShareholderSel = true;
  isUpdateForm = false;
  shareholderType = '';
  hasError = false;
  validationMessage = '';
  validationErrorMessage = '';
  showexistingDirectors = false;
  skipDocUpload = false;
  isUBOForm = false;
  hasRoleError = false;
  roleValidationMessage = '';
  @track formTemplatUniqueCode;
  @api actionTempId = "";
  @track sectionDetails;
  //@track shareHoldersAllData = [];
  @track sectionDetailsChild = [];
  @track parentObjectFieldName = [];
  @track existingData = [];
  childObjectName = "";
  @api listChild = [];
  @api childObjectInstance;
  @track formRows = [];
  @track sObjects = { sobjectType: "" };
  @track roleList = { sobjectType: "" };
  @track objAmendment = { sobjectType: "" };
  @track UBOAmendment = [];
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

  existingDirectors = 'Existing Director List';
  removedDirectors = 'Removed Director List';
  showRemovedDirectorsList = false;
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
  //@track showDirectorData = false;
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
  @track relatedRecordsAll = [];
  relatedRelRecords = [];
  documentURL = '';
  documentName = '';
  showPersonalInfo = false;
  showShareholdeTypeSection = false;
  showPPSpinner = false;
  showSpinner1 = false;
  showRegisteredActivities = false;
  addRegisteredActivities = 'Registered Activities';
  registeredActivities = [];
  serviceRequestRecord = '';
  helpText = `Please upload a clear, coloured scan of Applicant’s passport pages displaying personal details. Please ensure that your passport is valid for atleast 
                            six months from the date of submission. The maximum file size allowed is 2mb and accepted file formats are ".pdf,.jpeg,.jpg".`;
  documentText = 'Upload a Passport Copy';
  showHelp = false;
  duplicatecheck = false;
  @track addBtnlabel;
  entityType = '';
  addBoardMemberMetadata = [];
  //@track maximumAllowed = '';
  //@track hideAddBtnlabel = false;
  fieldsRenderByRule = ['PEP_Other__c', 'DACC_Registered__c', 'Corporate_Account__c', 'Place_of_Registration__c', 'Stock_Exchange_Government_Entity_Name__c', 'Are_you_resident_in_the_UAE__c', 'In_Out__c', 'Emirates_ID__c', 'Type_of_Politically_Exposed_Person__c', 'Secondary_Passport_Expiry_Date__c', 'Secondary_Passport_Issue_Date__c', 'Secondary_Passport_Issuing_country__c', 'Secondary_Passport_Number__c', 'Secondary_Place_Of_Issue__c'];
  nodeUniqueID;
  get showSpinner() {
    return this._spinner;
  }

  get showShareHoldersData() {
    return (this.shareHoldersData.length > 0) ? true : false;
  }

  get showUBOData() {
    return (this.uboData.length > 0) ? true : false;
  }

  get showDirectorData() {
    return (this.directorsData.length > 0 && this.formName != 'Add Shareholders') ? true : false;
  }

  get daccOptions() {
    return [
      { label: '--None--', value: '' },
      { label: 'Yes', value: 'Yes' },
      { label: 'No', value: 'No' }
    ];
  }
  /*
  get showShareHoldersCorporateData() {
    return  (this.sharedHoldersCorporateData.length > 0 && this.showShareHoldersForm == false) ? true : false;
  }
  */
  set showSpinner(val) {
    this._spinner = val;
  }
  showHelpText() {
    this.showHelp = true;
  }
  hideHelpText() {
    this.showHelp = false;
  }

  @track accountLookupId;
  @track countryLookupId;
  @wire(getRecord, {
    recordId: '$countryLookupId',
    countryFields
  })
  countryObjRec;
  @wire(getRecord, {
    recordId: '$accountLookupId',
    accountFields
  })
  AccountObjRec;

  countryName;
  accountName;
  accountCountryName;

  get childObjectForUBO() {
    return LA_OBJECT.objectApiName;
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
        this.sObjects['Shareholder_Type__c'] = this.picklistOptions[0].value;
      }
    } else if (error) {
      // Handle error
    }
  }


  get isShareHolderForm() {
    return (this.formName == 'Add Shareholders' || this.formName == 'Add Ultimate Beneficiary Owner') ? true : false;
  }
  get isShareHolderFome1() {
    return (this.formName == 'Add Shareholders') ? true : false;
  }
  get isCorporateShareholder() {
    return (this.shareholderType == 'Corporate') ? true : false;
  }
  get isSelectedShareholderType() {
    return (this.formName == 'Add Shareholders' && ((this.shareholderType == 'Corporate' && this.isDCAARegistered == 'No') || this.shareholderType == 'Individual')) ? true : false;
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
    try {
      this.showSpinner = true;
      this.isAmendmentCreated = false;
      this.hasRoleError = false;
      this.roleValidationMessage = '';
      this.uboOwnershipPercentage = 0;
      this.uboPercentage = 0;
      this.template.addEventListener('keydown', this.handleKeyDown.bind(this));
      this.relatedRecordsAll = [];
      //this.shareholderType = 'Individual';
      //this.shareHolderSelectedValue = 'Individual';
      this.serviceRequestRecord = await getAccountDetails({ srId: this.serviceRequestId });
      /* let result = await getRegistrationActivities({ accountId: this.serviceRequestRecord.Account_Name__c});
        this.registeredActivities = JSON.parse(result);
        this.showRegisteredActivities = this.registeredActivities.length > 0 ? true : false;
        */
      this.isShareHolderPage = false;
      await this.getFormDetails();
      this.skipDocUpload = false;
      this.showPersonalInfo = true;
      this.showShareholdeTypeSection = false;
      this.reqObjectName = "OB_Amendment__c";
      this.formName = this.sectionDetails[0].section.acbox__Action_Page_Flow__r.acbox__Menu_Title__c;
      this.formTemplatetitle = this.sectionDetails[0].section.acbox__Action_Page_Flow__r.acbox__Menu_Title__c;
      console.log('formTemplatUniqueCode::' + this.formTemplatUniqueCode);
      this.setColumns();
      this.setFormParams();
      //this.hideAddBtnlabel = false;
      const accordions = this.template.querySelectorAll(".accordion");
      this.sObjects["sobjectType"] = this.reqObjectName;
      this.sObjects["Onboard_Request__c"] = this.serviceRequestId;
      await this.getFromData();
      this.isUpdateForm = false;
      this.isShareholderSel = true;
      console.log('formTemplatetitle::' + this.formTemplatetitle);
      // if(this.formTemplatetitle == 'Add Shareholders' || this.formTemplatetitle == 'Add Ultimate Beneficiary Owner'){
      //   this.isShareholderSel = true;
      //   for(var i = 0; i < this.sectionDetails.length; i++){            
      //         if(!(this.sectionDetails[i].section.acbox__Type__c) || (this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue))
      //           this.sectionDetails[i].section.isRenderByDefault = true;
      //         else 
      //           this.sectionDetails[i].section.isRenderByDefault = false; 
      //       }
      // }
      /* if(this.formTemplatetitle == 'Update Manager' || this.formTemplatetitle == 'Update Director' || this.formTemplatetitle == 'Update Secretary' || this.formTemplatetitle == 'Update Shareholder')
        this.isUpdateForm = false;
        if(this.formName == 'AllMembers'){
          this.sharedHoldersColumns = ["Name","Passport Number","Email","Mobile","Action"];
          this.requiredActionsHeader = ["Name","Passport Number", "Role","Email","Mobile","Action"];
        }*/
      this.relatedRecords = await this.getRelatedData();
      // console.log('this.relatedRecords--->'+JSON.stringify(this.relatedRecords));
      this.existingRecords = await this.getSelectedRelationInfo();
      // console.log('this.existingRecords--->'+JSON.stringify(this.existingRecords));
      let passportNumber;
      if (this.existingRecords.length > 0) {
        this.existingRecords.forEach(item => {
          //  console.log('Item Record--->'+JSON.stringify(item.passportNumber));
          passportNumber = item.passportNumber;
        });
      }
      // console.log('passportNumber---->'+passportNumber);
      if (this.relatedRecords.length > 0) {
        this.relatedRecords.forEach(item => {
          console.log('related item --->' + item);
          if (item.passportNumber === passportNumber) {
            this.isAmendmentCreated = true;
          }
        });
      }
      // console.log('this.isAmendmentCreated---->'+this.isAmendmentCreated);   
      if (this.isAmendmentCreated == true) {
        // this.showChoosefromExisting = false;
        //this.relatedRecordsAll = [...this.relatedRecords]; 
        if (this.relatedRecords.length > 0) {
          this.relatedRecords.forEach((item) => {
            if (!item.role.includes('Shareholder')) {
              this.relatedRecordsAll.push(item);
            }
          });
        }
      } else {
        // this.showChoosefromExisting = this.existingRecords.length > 0 ? true : false;
        let records = [];
        if (this.relatedRecords.length > 0) {
          this.relatedRecords.forEach((item) => {
            if (!item.role.includes('Shareholder')) {
              records.push(item);
            }
          });
        }
        this.relatedRecordsAll = [...this.existingRecords, ...records];
      }
      this.showChoosefromExisting = this.relatedRecordsAll.length > 0 ? true : false;


      /* if(this.formTemplatUniqueCode == 'AddorRemoveDirector'){ 
        this.hideChoosefromPeople=false;
      }
        if(this.formTemplatUniqueCode == 'AddorRemoveDirector' && this.activeDirectorListfromAccount && this.activeDirectorListfromAccount.length>0){
          this.showexistingDirectors =true;
          this.showShareHoldersForm = false;
          this.hideChoosefromPeople=false;
        }else if(this.activeDirectorListfromAccount && this.activeDirectorListfromAccount.length==0){
            this.showexistingDirectors =false;
            this.showShareHoldersForm = false;
          }
          */
      const event = new CustomEvent("childrendered", {
        detail: {
          childComponentName: "application",
          serviceRequestId: this.serviceRequestId
        }
      });
      this.dispatchEvent(event);


      var tempList = this.activeDirectorListfromAccount;
      var listdir = [];
      if (this.directorsData && this.directorsData.length > 0) {
        for (var itr of this.directorsData) {
          listdir.push(itr.RelationShipId__c);
        }
      }
      var finalListDir = [];
      for (var itr of tempList) {
        if (listdir.indexOf(itr.Id) == -1)
          finalListDir.push(itr);
      }
      this.activeDirectorListfromAccount = finalListDir;
    } catch (error) {
      console.error('Error fetching data connected callback', error);
    }


  }

  handleKeyDown(event) {
    if (event.key === 'Enter') {
      event.preventDefault();
    }
  }

  setColumns() {

    this.requiredActionsHeader = [];
    this.requiredActionsHeader.push({ label: "Name", stylecss: "flex: 0 0 30%;" });
    this.requiredActionsHeader.push({ label: "Passport Number", stylecss: "flex: 0 0 20%;" });
    this.requiredActionsHeader.push({ label: "Role", stylecss: "flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;" });
    this.requiredActionsHeader.push({ label: "Status", stylecss: "flex: 0 0 10%;" });
    this.requiredActionsHeader.push({ label: "Action", stylecss: "flex: 0 0 10%;" });

    this.sharedHoldersColumns = [];
    this.sharedHoldersColumns.push({ label: "Name", stylecss: "flex: 0 0 20%;" });
    this.sharedHoldersColumns.push({ label: "Type", stylecss: "flex: 0 0 10%;" });
    this.sharedHoldersColumns.push({ label: "No of Shares", stylecss: "flex: 0 0 10%;" });
    this.sharedHoldersColumns.push({ label: "Ownership %", stylecss: "flex: 0 0 15%;" });
    this.sharedHoldersColumns.push({ label: "Role", stylecss: "flex: 0 0 15%;" });// max-width: 200px; "flex: 0 0 18%; word-break: break-word; white-space: break-spaces; max-width: 200px;"
    //this.sharedHoldersColumns.push({label: "UBO Ownership %", stylecss: "flex: 0 0 10%;"});
    this.sharedHoldersColumns.push({ label: "Passport / License #", stylecss: "flex: 0 0 15%;" });
    this.sharedHoldersColumns.push({ label: "Status", stylecss: "flex: 0 0 10%;" });
    this.sharedHoldersColumns.push({ label: "Action", stylecss: "flex: 0 0 10%;" });

    this.relatedDataColumns = [];
    this.relatedDataColumns.push({ label: "Name", stylecss: "flex: 0 0 30%;" });
    this.relatedDataColumns.push({ label: "Passport Number", stylecss: "flex: 0 0 30%;" });
    this.relatedDataColumns.push({ label: "Role", stylecss: "flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;" });
    this.relatedDataColumns.push({ label: "Action", stylecss: "flex: 0 0 10%;" });
  }

  /*getAddBoardMembersData(){
   getAddBoardMembersData({requestId:this.serviceRequestId}).then(result => {
      if(result !=null){
        this.entityType = result.EntityType;
        this.addBoardMemberMetadata = result.AddBoardMemberMetadataList;
        for(let i=0; i<this.addBoardMemberMetadata.length; i++){
          console.log('this.addBoardMemberMetadata[i]-->'+JSON.stringify(this.addBoardMemberMetadata[i]));
            if(this.addBoardMemberMetadata[i].Entity_Type__c == entityType && this.addBoardMemberMetadata[i].Role__c == this.formRole){
                this.maximumAllowed = this.addBoardMemberMetadata[i].Maximum_Allowed__c;
            }
        }
      }
    });
     return this.maximumAllowed;
  }*/

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

            // window.location.reload();
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

  /*    
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
         // this.dyn_functions[inputJSFunction](fieldValue,this.sObjects,function(result){
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
         //});
       } else {
         if (fieldType == "Time") {
           fieldValue = fieldValue;//this.getDateFromHours(fieldValue);
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
  */
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
        console.log('field--->' + field);
        return validSoFar && field.reportValidity();
      },
      true
    );
  }

  /* handleOnLoad(event) {
     this.loadCustomCmp = false;
    if (this.serviceRequestId && this.serviceRequestId != "") {
      var record = event.detail.records;
      var fields = record[this.serviceRequestId].fields; // record['0010K000026Y******'].fields;
      for (const key in fields) {
        if (fields.hasOwnProperty(key)) {
          if (fields[key].value != null && !fields[key].value.hasOwnProperty("apiName")) {
            this.sObjects[key] = fields[key].value;
            if( this.sectionDetails &&  this.sectionDetails.length >0){
              for (var i = 0; i < this.sectionDetails.length; i++) {
                let sec_fields = this.sectionDetails[i].sectionDetails;
                for (var j = 0; j < sec_fields.length; j++) {
                  if(key == sec_fields[j].acbox__Field_API_Name__c){
                    this.sectionDetails[i].acbox__Default_Value__c = fields[key].value;
                    break;
                  } 
                }
              }
            }
          }
        }
      }
    } else {
      return;
    }

    this.loadCustomCmp = true;
  }*/

  /*   toggleAccordion(event) {
      // find paretn .accordion
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
  
    } */


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
    this.picklistOptions.forEach(obj => {
      if (obj['value'] == this.shareHolderSelectedValue) {
        obj['checked'] = 'checked';
      }
    })

    if (fieldAPIName == 'Shareholder_Type__c') {
      this.documentName = '';
      this.uploadedFileName = '';
      this.validationMessage = '';
      this.showChoosefromExisting = this.relatedRecordsAll.length > 0 ? true : false;
      //this.showChoosefromPeople = this.relatedRecords.length > 0 ? true : false;
      this.shareholderType = fieldValue;
      this.shareHolderSelectedValue = fieldValue;
      this.helpText = `Please upload a clear, coloured scan of Applicant’s passport pages displaying personal details. Please ensure that your passport is valid for atleast 
                            six months from the date of submission. The maximum file size allowed is 2mb and accepted file formats are ".pdf,.jpeg,.jpg".`;
      if (fieldValue == 'Corporate') {
        this.documentText = 'Upload a License Copy';
        this.helpText = 'Please upload company Trade License copy.';
      } else {
        this.documentText = 'Upload a Passport Copy';
      }
      if (this.shareHolderSelectedValue == 'Individual') {
        this.isNotDACCRegistered = true;
        this.showPersonalInfo = false;
        this.showShareholdeTypeSection = true;
        for (var i = 0; i < this.sectionDetails.length; i++) {
          if (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType')
            this.sectionDetails[i].section.isRenderByDefault = true;
          else
            this.sectionDetails[i].section.isRenderByDefault = false;
          var fields = this.sectionDetails[i].sectionDetails;
          for (var j = 0; j < fields.length; j++) {
            if (fields[j].acbox__Field_API_Name__c == 'DACC_Registered__c') {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }
            if (fields[j].acbox__Field_API_Name__c == 'Corporate_Account__c') {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }
            if (fields[j].acbox__Field_API_Name__c == 'Place_of_Registration__c') {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
        }
        /*
        for (var i = 0; i < this.sectionDetails.length; i++) { 
         if(!(this.sectionDetails[i].section.acbox__Type__c) || (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType' || this.sectionDetails[i].section.acbox__Type__c == fieldValue && this.sectionDetails[i].section.Name != 'UBO Details'))
          this.sectionDetails[i].section.isRenderByDefault = true;
         else
           this.sectionDetails[i].section.isRenderByDefault = false;
         
         var fields = this.sectionDetails[i].sectionDetails; 
         for (var j = 0; j < fields.length; j++) {
          if(fields[j].acbox__Field_API_Name__c == 'DACC_Registered__c'){
                fields[j].isRenderByDefault = false;
                fields[j].acbox__Default_Value__c ='';
                this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
            }
            if(fields[j].acbox__Field_API_Name__c == 'Corporate_Account__c'){
                fields[j].isRenderByDefault = false;
                fields[j].acbox__Default_Value__c ='';
                this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
            } 
         }
        } */
      } else if (this.shareHolderSelectedValue == 'Corporate') {
        this.showPersonalInfo = false;
        this.showShareholdeTypeSection = true;
        //this.showChoosefromPeople = false;
        this.showChoosefromExisting = false;
        console.log('shareholderType::' + this.shareholderType);
        for (var i = 0; i < this.sectionDetails.length; i++) {
          if (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType')
            this.sectionDetails[i].section.isRenderByDefault = true;
          else
            this.sectionDetails[i].section.isRenderByDefault = false;
          var fields = this.sectionDetails[i].sectionDetails;
          for (var j = 0; j < fields.length; j++) {
            if (fields[j].acbox__Field_API_Name__c == 'DACC_Registered__c') {
              fields[j].isRenderByDefault = true;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }
            if (fields[j].acbox__Field_API_Name__c == 'Corporate_Account__c') {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }
            if (fields[j].acbox__Field_API_Name__c == 'Place_of_Registration__c') {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
        }
      }
    } else if (fieldAPIName == 'DACC_Registered__c') {
      this.isDCAARegistered = fieldValue;
      for (var i = 0; i < this.sectionDetails.length; i++) {
        if (fieldValue == 'No') {
          this.isNotDACCRegistered = false;
          /*if(this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType'){
            this.sectionDetails[i].section.isRenderByDefault = true;
          }else{
            this.sectionDetails[i].section.isRenderByDefault = false;	
          }*/
          if (!(this.sectionDetails[i].section.acbox__Type__c) || (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType' || this.sectionDetails[i].section.acbox__Type__c == this.shareholderType)) {
            this.sectionDetails[i].section.isRenderByDefault = true;
            if (this.sectionDetails[i].section.Name == 'Additional Ultimate Beneficiary Owners' || this.sectionDetails[i].section.Name == 'Corporate UBO Individual')
              this.sectionDetails[i].section.isRenderByDefault = false;
          } else {
            this.sectionDetails[i].section.isRenderByDefault = false;
          }
        }
        else if (fieldValue == 'Yes') {
          this.isNotDACCRegistered = false;
          this.validationMessage = '';
          this.validationErrorMessage = '';
          if (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType' || (this.sectionDetails[i].section.Name == 'Roles - Corporate') || (this.sectionDetails[i].section.Name == 'Power of Attorney Details')) {
            this.sectionDetails[i].section.isRenderByDefault = true;
            if (this.sectionDetails[i].section.Name == 'Roles - Corporate') {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if (fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c') {
                  fields[j].isRenderByDefault = false;
                  fields[j].acbox__Default_Value__c = '';
                  this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
                }
              }
            }
          }
          else
            this.sectionDetails[i].section.isRenderByDefault = false;
        }
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'Corporate_Account__c') {
            if (fieldValue == 'Yes') {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';

            }

          }
          if (fields[j].acbox__Field_API_Name__c == 'Place_of_Registration__c') {
            if (fieldValue == 'No') {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';

            }

          }
        }
      }

    } else if (fieldAPIName == 'Corporate_Account__c') {
      let accData = [];
      if (fieldValue != '') {
        await getSelectedAccInfo({ accId: fieldValue })
          .then(result1 => {
            accData = result1;
            console.log('accData::' + JSON.stringify(accData));
            this.accountName = accData[0]?.Name;
            this.accountCountryName = accData[0]?.CountryName_of_Origin__c
          })
          .catch(error => {
            console.error('Error calling Apex method:', error);
          });
        this.setUboRelationshipJSON(this.isOldUboSnapshot());
      }

      for (var i = 0; i < this.sectionDetails.length; i++) {
        if (this.sectionDetails[i].section.Name == 'Company Address') {
          var fields = this.sectionDetails[i].sectionDetails;
          for (var j = 0; j < fields.length; j++) {
            if (fields[j].acbox__Field_API_Name__c == 'Address2__c' && accData[0]?.Building_Villa_Flat__c) {
              fields[j].acbox__Default_Value__c = accData[0]?.Address2__c;
              this.sObjects[fields[j].acbox__Field_API_Name__c] = accData[0]?.Building_Villa_Flat__c;
            }
            if (fields[j].acbox__Field_API_Name__c == 'Street_Address__c' && accData[0]?.Street_Name__c) {
              fields[j].acbox__Default_Value__c = accData[0]?.Street_Name__c;
              this.sObjects[fields[j].acbox__Field_API_Name__c] = accData[0]?.Street_Name__c;
            }
            if (fields[j].acbox__Field_API_Name__c == 'Address1__c' && accData[0]?.Area__c) {
              fields[j].acbox__Default_Value__c = accData[0]?.Area__c;
              this.sObjects[fields[j].acbox__Field_API_Name__c] = accData[0]?.Area__c;
            }
            if (fields[j].acbox__Field_API_Name__c == 'City__c' && accData[0]?.City_Town__c) {
              fields[j].acbox__Default_Value__c = accData[0]?.City_Town__c;
              this.sObjects[fields[j].acbox__Field_API_Name__c] = accData[0]?.City_Town__c;
            }
            if (fields[j].acbox__Field_API_Name__c == 'Country__c' && accData[0]?.Country_Address__c) {
              fields[j].acbox__Default_Value__c = accData[0]?.Country_Address__c;
              this.sObjects[fields[j].acbox__Field_API_Name__c] = accData[0]?.Country_Address__c;
            }
          }
        }
      }
    } else if (fieldAPIName == 'Place_of_Registration__c') {
      if (fieldValue != '') {
        if (fieldValue == 'a0KD0000008luCWMAY') {
          this.documentText = 'Upload a License Copy';
          this.helpText = 'Please upload company Trade License copy.';
          this.isNotDACCRegistered = true;
        } else {
          this.isNotDACCRegistered = true;
          this.documentText = 'Upload Good Standing Certificate';
          this.helpText = 'Please upload company Good Standing Certificate copy.';
        }
        await getCountryName({ countryId: fieldValue })
          .then(result => {
            this.countryName = result;
          })
          .catch(error => {
            console.error('Error calling Apex method:', error);
          });
        this.setUboRelationshipJSON(this.isOldUboSnapshot());
      }
    } else if (fieldAPIName == 'Company_Name__c') {
      if (fieldValue != '') {
        this.setUboRelationshipJSON(this.isOldUboSnapshot());
      }
    }
          // for (var i = 0; i < this.sectionDetails.length; i++) {            
          //   if(!(this.sectionDetails[i].section.acbox__Type__c) || (this.sectionDetails[i].section.acbox__Type__c == this.ShareholderType || this.sectionDetails[i].section.acbox__Type__c == fieldValue))
          //     this.sectionDetails[i].section.isRenderByDefault = true;
          //   else 
          //     this.sectionDetails[i].section.isRenderByDefault = false; 
          // }
      /*else if(fieldAPIName == 'Are_you_resident_in_the_UAE__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c'){
                  if(fieldValue == 'Yes' || fieldValue == true){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                 
                }
              }
          }
      } else if(fieldAPIName == 'Are_you_a_Politically_Exposed_Person__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c'){
                  if(fieldValue == 'Yes'){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                      fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                 
                }
              }
          }
      }*/else if (fieldAPIName == 'Have_you_visited_the_UAE_before__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c') {
            if (fieldValue == 'Yes') {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
          if (fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c') {
            fields[j].isRenderByDefault = false;
            fields[j].acbox__Default_Value__c = '';
            this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
          }
        }
      }
    } else if (fieldAPIName == 'Emirates_ID__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          const sanitizedInput = fieldValue.replace(/[^0-9]/g, '');
          let formattedInput = '';
          //Define the positions where dashes should be inserted
          const positions = [3, 4, 7];
          let currentIndex = 0;
          for (let i = 0; i < sanitizedInput.length; i++) {
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
    } else if (fieldAPIName == 'Type_of_Politically_Exposed_Person__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'PEP_Other__c') {
            if (fieldValue == 'Other') {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
        }
      }
    }/*else if(fieldAPIName == 'Do_you_have_dual_Nationality__c'){
          for (var i = 0; i < this.sectionDetails.length; i++) {
              var fields = this.sectionDetails[i].sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if(fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c'
                   || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issuing_country__c'
                   || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Place_Of_Issue__c'){
                  if(fieldValue == 'Yes'){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                      fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                 
                }
              }
          }
      }*//*else if(fieldAPIName == 'Category__c'){
          for(var i = 0; i < this.sectionDetails.length; i++){
              var fields = this.sectionDetails[i].sectionDetails;
              for(var j = 0; j < fields.length; j++){           
                if(fields[j].acbox__Field_API_Name__c == 'Trade_License_Number__c'){
                  if(fieldValue == 'License Number'){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }                
                }
                if(fields[j].acbox__Field_API_Name__c == 'Registration_Number__c'){
                  if(fieldValue == 'Registration Number'){
                     fields[j].isRenderByDefault = true;
                  }else{
                     fields[j].isRenderByDefault = false;
                     fields[j].acbox__Default_Value__c ='';
                     this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
                  }
                }       
              }
          }
      }*/

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
          // Clear the field value
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
      fieldValue = fieldValue;// this.getDateFromHours(fieldValue);
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

  //mobile country code change
  handleMobileCountryCode(event) {
    let countryCode = event.detail.value;
    let fieldName = event.detail.mobileFieldApiName;
    this.sObjects[fieldName] = this.sObjects[fieldName] == '' ? countryCode : countryCode + '-' + this.sObjects[fieldName];
    this.countryCodes[fieldName] = countryCode;
  }

  //handle Toggle Change Event
  async handleToggleChange(event) {
    // if (event.detail.value) {
    this.sObjects[event.detail.fieldapi] = event.detail.value;
    let inputJSFunction = event.detail.onChangeJS;
    let errorMsg = event.detail.customError ? event.detail.customError : 'Please enter Valid Data';
    let result = inputJSFunction ? await this.dyn_functions[inputJSFunction](event.detail.value, this.sObjects) : true;
    let fieldAPIName = event.detail.fieldapi;
    let fieldValue = event.detail.value;
    if (fieldValue == 'Yes') {
      this.isChecked = true;
    } else {
      this.isChecked = false;
    }
    console.log('isChecked-->' + this.isChecked);
    console.log('PROCESSVAL:: ' + event.detail.fieldapi + '::: ' + event.detail.value + '::: ' + JSON.parse(result));
    //console.log('sectionDetails1::'+JSON.stringify(this.sectionDetails));
    if (fieldAPIName == 'Are_you_resident_in_the_UAE__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c') {
            if (fieldValue == 'Yes' && result == true) {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
          /* if( this.sectionDetails[i].section.Name == 'POC Individual Details' && fields[j].acbox__Field_API_Name__c == 'Passport_Number__c'){              
            if(fieldValue == 'Yes' && result == true){
               fields[j].isRenderByDefault = false;
            }else{
               fields[j].isRenderByDefault = true;
               fields[j].acbox__Default_Value__c ='';
               this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
            }
           
          } */
        }
      }
    } else if (fieldAPIName == 'Are_you_a_Politically_Exposed_Person__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c') {
            if (fieldValue == 'Yes' && result == true) {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }
          }
          if (fields[j].acbox__Field_API_Name__c == 'PEP_Other__c') {
            fields[j].isRenderByDefault = false;
            fields[j].acbox__Default_Value__c = '';
            this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
          }
        }
      }
    } else if (fieldAPIName == 'Are_you_the_custodian__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c') {
            if (fieldValue == 'Yes' && result == true) {
              fields[j].isRenderByDefault = false;
            } else {
              fields[j].isRenderByDefault = true;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
        }
      }
    } else if (fieldAPIName == 'Do_you_have_dual_Nationality__c') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        for (var j = 0; j < fields.length; j++) {
          if (fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c'
            || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issuing_country__c'
            || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Place_Of_Issue__c') {
            if (fieldValue == 'Yes' && result == true) {
              fields[j].isRenderByDefault = true;
            } else {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }

          }
        }
      }
    } else if (fieldAPIName == 'Is_UBO__c' && this.shareholderType == 'Individual') {
      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        if (fieldValue == true) {
          if (!(this.sectionDetails[i].section.acbox__Type__c) || (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType' || this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue)) {
            this.sectionDetails[i].section.isRenderByDefault = true;
            if (this.sectionDetails[i].section.Name == 'Additional Ultimate Beneficiary Owners' || this.sectionDetails[i].section.Name == 'Corporate UBO Individual') {
              this.sectionDetails[i].section.isRenderByDefault = false;
            }
          } else {
            this.sectionDetails[i].section.isRenderByDefault = false;
          }
        } else {
          if (!(this.sectionDetails[i].section.acbox__Type__c) || (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType' || this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue) && this.sectionDetails[i].section.Name != 'UBO Details') {
            this.sectionDetails[i].section.isRenderByDefault = true;
            if (this.sectionDetails[i].section.Name == 'Additional Ultimate Beneficiary Owners' || this.sectionDetails[i].section.Name == 'Corporate UBO Individual') {
              this.sectionDetails[i].section.isRenderByDefault = false;
            }
            /* for(var j = 0; j < fields.length; j++) {
              if(fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Name__c'
               || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Issue_Date__c'
               || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Email__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Mobile_Number__c' || fields[j].acbox__Field_API_Name__c == 'Number_of_UBO__c'){
                 fields[j].isRenderByDefault = false;
                 fields[j].acbox__Default_Value__c ='';
                 this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
               }
             }*/
            console.log('fields--->' + JSON.stringify(this.sectionDetails[i].section));
          } else {
            this.sectionDetails[i].section.isRenderByDefault = false;
          }
        }
      }
      // for(var i = 0; i < this.sectionDetails.length; i++) {
      //       var fields = this.sectionDetails[i].sectionDetails;
      //       for (var j = 0; j < fields.length; j++) {
      //         if(fields[j].acbox__Field_API_Name__c == 'When_this_individual_became_UBO__c'
      //            || fields[j].acbox__Field_API_Name__c == 'Are_you_the_custodian__c' || fields[j].acbox__Field_API_Name__c == 'How_this_individual_became_the_UBO__c'
      //            || fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c'){
      //           if(fieldValue == 'Yes' && result == true){
      //              fields[j].isRenderByDefault = true;
      //           }else{
      //              fields[j].isRenderByDefault = false;
      //              fields[j].acbox__Default_Value__c ='';
      //              this.sObjects[fields[j].acbox__Field_API_Name__c] ='';
      //           }

      //         }
      //       }
      //   }
    }
    else if (fieldAPIName == 'Is_UBO__c' && this.shareholderType == 'Corporate') {
      this.showSpinner = true;
      /* this.template
        .querySelectorAll("lightning-input-field")
        .forEach((element) => element.reportValidity());

      // Validate fields
      this.template.querySelectorAll("lightning-input-field").forEach((element) => {
        element.reportValidity();
      });

      let isValid = this.validateFields();
      let isInputFieldValid = this.validateInputFields();

      if (!isValid || !isInputFieldValid) {
        // If validation fails, revert the checkbox value for this field
        this.sObjects[event.detail.fieldapi] = 'No';
        // Find the corresponding checkbox component and reset its value
        this.template.querySelectorAll('c-ds_-portal-checkbox-toggle').forEach(checkbox => {
          if (checkbox.fieldapiName === event.detail.fieldapi) {
            checkbox.bindValue = false; // Revert value
          }
        });
        this.showSpinner = false;
        return;
      } */
      console.log('this.accountName :' + this.accountName);
      console.log('this.accountCountryName :' + this.accountCountryName);
      console.log('this.countryName :' + this.countryName);
      this.setUboRelationshipJSON(this.isOldUboSnapshot());

      for (var i = 0; i < this.sectionDetails.length; i++) {
        var fields = this.sectionDetails[i].sectionDetails;
        //for (var i = 0; i < this.sectionDetails.length; i++) {
        if (fieldValue == true) {
          //Added by manoj
          /*  if (this.sectionDetails[i].section.acbox__Type__c && this.sectionDetails[i].section.acbox__Type__c.includes('UBO_TREE_MAP')) {
             for (var j = 0; j < fields.length; j++) {
               fields[j].acbox__Default_Value__c = '';
             }
             if (!this.uboSectionDetail.some(item => item === this.sectionDetails[i])) {
               this.uboSectionDetail.push(this.sectionDetails[i]);
             }
 
           } */
          //commented by manoj to show ubp tree
          /* if(this.sectionDetails[i].section.Name == 'Additional Ultimate Beneficiary Owners' || this.sectionDetails[i].section.Name == 'Corporate UBO Individual'){
            this.sectionDetails[i].section.isRenderByDefault = true;
          } */
        } else {
          if (this.sectionDetails[i].section.Name == 'Additional Ultimate Beneficiary Owners' || this.sectionDetails[i].section.Name == 'Corporate UBO Individual' || this.sectionDetails[i].section.acbox__Type__c.includes('UBO_TREE_MAP')) {
            this.sectionDetails[i].section.isRenderByDefault = false;
          }
          for (var j = 0; j < fields.length; j++) {
            if (fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Name__c'
              || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Issue_Date__c'
              || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Email__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Mobile_Number__c' || fields[j].acbox__Field_API_Name__c == 'Number_of_UBO__c') {
              fields[j].isRenderByDefault = false;
              fields[j].acbox__Default_Value__c = '';
              this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
            }
          }
          //}
        }
      }
      this.isUBOTreeVisible = fieldValue;
    }
    if (!result) {
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
    this.showSpinner = false;
    //}
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
      if (!isInputFieldValid) {
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
        // if (this.dirtyFlag) {

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
        // }
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
        console.log('result previous page--->' + result);
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
        // Handle errors
        console.error('Apex method error:', error);
      });
  }

  async createReqDocuments() {
    let flag = { validity: true };
    await createReqDocuments({ reqId: this.serviceRequestId, reqType: 'CompanyRegistration' })
      .then(result => {
        if (result != 'Success') {
          flag.validity = false;
          flag.error = result;
        }
      }).catch(error => {
        // Handle errors
        console.error('Apex method error:', error);
      });
    return flag;
  }

  async createReqFee() {
    let flag = { validity: true };
    await createReqFee({ reqId: this.serviceRequestId, reqType: 'CompanyRegistration' })
      .then(result => {
        if (result != 'Success') {
          flag.validity = false;
          flag.error = result;
        }
      }).catch(error => {
        // Handle errors
        console.error('Apex method error:', error);
      });
    return flag;
  }

  @api
  async goToNextPage() {
    this.showSpinner = true;
    if (this.formTemplatetitle == 'Add Shareholders' || this.formTemplatetitle == 'Add Board Members' || this.formTemplatetitle == 'Add Directors' || this.formTemplatetitle == 'Add Secretary' || this.formTemplatetitle == 'Add General Manager' || this.formTemplatetitle == 'Add legal Representative' || this.formTemplatetitle == 'Add Ultimate Beneficiary Owner') {
      let flag = await this.checkAmmendmentRecordsWithRole();
      if (!flag.validity) {
        this.showSpinner = false;
        return flag;
      }
    }
    if (this.formTemplatetitle == 'Add Shareholders' && this.serviceRequestRecord.Share_Capital__c < 300000) {
      let flag = { validity: false };
      flag.validity = false;
      flag.error = "Share Capital amount should not be less than minimum required amount AED 300000.";
      this.showSpinner = false;
      return flag;
    }

    let flag = await this.createReqDocuments();
    if (!flag.validity) {
      this.showSpinner = false;
      return flag;
    }

    let flag1 = await this.createReqFee();
    if (!flag1.validity) {
      this.showSpinner = false;
      return flag1;
    }
    await getNextPageflowDetails({ previousPageFlow: this.formName, actionTemplateID: this.actionTempId })
      .then(result => {
        // Handle the result
        console.log('Apex method result:', result);
        this.currentFlowId = result.Id;
        this.formName = result.Name;
        this.updateFormRole();
        this.sectionDetails = [];
        this.obrecordId = '';
        this.connectedCallback();
      })
      .catch(error => {
        // Handle errors
        console.error('Apex method error:', error);
      });
    let validation = {
      validity: true,
      flowId: this.currentFlowId
    };
    // await this.xCreateServiceRequest();
    await updateBOPercentage({ srId: this.serviceRequestId })
    return validation;
  }
  /*async checkAmmendmentRecords(){
     let flag = { validity: true };
     this.noActiveAmmendment=false;
    await  getExistingAndNewAmmendmentRecords({recordId: this.serviceRequestId, role:this.formRole})
    .then(result => {
      var tempAmmListAmnd=result.amendmentList;
      var newAmdList= result.amendmentList.filter(record => (record.Status__c === 'New' || record.Status__c === 'Existing'));
      var remAmdList= result.amendmentList.filter(record => record.Status__c === 'Remove');
      var tempRelList=result.relationshipList;
      if(tempAmmListAmnd.length ==0){
        this.noActiveAmmendment=true;
      }
      if (this.noActiveAmmendment) {
        flag.validity = false;
        flag.error = "There Should be Atleast One Record Added before Proceding";
      }
      if(remAmdList.length==tempRelList.length && newAmdList.length == 0){
        flag.validity = false;
        flag.error = "There Should be Atleast One "+this.formRole;
      }
      })
      .catch(error => {
        // Handle errors
        console.error('Apex method error:', error);
      });
      return flag;
  }*/
  async checkAmmendmentRecordsWithRole() {
    let flag = { validity: true };
    this.noActiveAmmendment = false;
    this.directorsListTemp = [];
    this.shareholdersListTemp = [];
    this.managerListTemp = [];
    this.secretaryListTemp = [];
    this.legalRepListTemp = [];
    this.uboListTemp = [];
    this.uboListIndividual = [];
    await getExistingAndNewAmmendmentRecordsWithRole({ recordId: this.serviceRequestId })
      .then(result => {
        this.ammListTemp = result.amendmentList;
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
            /* if(roles.includes('Legal Representative')) {
                 this.legalRepListTemp.push(record);
             } */
            if (roles.includes('UBO')) {
              this.uboListTemp.push(record);
            }
          }
        });

        if ((this.directorsListTemp.length == 0 && this.formRole == 'Director') || (this.shareholdersListTemp.length == 0 && this.formRole == 'Shareholder') ||
          (this.secretaryListTemp.length == 0 && this.formRole == 'Secretary') || (this.managerListTemp.length == 0 && this.formRole == 'Manager') || /*(this.legalRepListTemp.length ==0 && this.formRole=='Legal Representative')||*/
          (this.uboListTemp.length == 0 && this.formRole == 'UBO')) {
          this.noActiveAmmendment = true;
        }
        //Added by Vinod
        if (this.uboListTemp.length > 0 && this.formRole == 'UBO') {
          this.uboListTemp.forEach(record => {
            if (record.Owner_Type__c != 'Corporate') {
              this.uboListIndividual.push(record);
            }
          });
        }
        //Added by Vinod

        if (this.noActiveAmmendment) {
          flag.validity = false;
          flag.error = "Atleast one record should be added before proceding further";
        }
        if (this.formRole == 'Shareholder') {

          if (this.managerListTemp.length > 1) {
            flag.validity = false;
            flag.error = "The company should have only one General Manager.";
            return flag;
          }

          if (this.secretaryListTemp.length > 1) {
            flag.validity = false;
            flag.error = "The company should have only one Secretary.";
            return flag;
          }
        }

        if (this.formRole == 'UBO' && this.uboListIndividual.length == 0) {
          flag.validity = false;
          flag.error = "Atleast one individual record should be added, if it is a corporate UBO before proceding further";
        }

        console.log('=====' + this.noActiveAmmendment);
      })
      .catch(error => {
        // Handle errors
        console.error('Apex method error:', error);
      });
    return flag;
  }
  updateFormRole() {
    if (this.formName == 'Add Shareholders') {
      this.formRole = 'Shareholder';
    } else if (this.formName == 'Add Board Members' || this.formName == 'Add Directors' || this.formName == 'Add General Manager' || this.formName == 'Add Secretary') {
      this.formRole = 'Director;Manager;Secretary';
    }/* else if (this.formName == 'Add Directors') {
      this.formRole = 'Director';
    } else if (this.formName == 'Add Secretary') {
      this.formRole = 'Secretary';
    } else if (this.formName == 'Add General Manager') {
      this.formRole = 'Manager';
    } */else if (this.formName == 'Add Legal Representative') {
      this.formRole = 'Legal Representative';
    } else if (this.formName == 'Add Ultimate Beneficiary Owner') {
      this.formRole = 'UBO';
    }
  }

  setFormParams() {
    var optIndividual = { label: 'Individual', value: 'Individual' };
    var optCorp = { label: 'Corporate', value: 'Corporate' };
    var optExceptionUBO = { label: 'Government / Listed on Stock Exchange', value: 'Government / Listed on Stock Exchange' };
    var pickOptions = [];
    pickOptions.push(optIndividual);
    pickOptions.push(optCorp);
    pickOptions.push(optExceptionUBO);
    this.picklistOptions = pickOptions;
    if (this.formName == 'Add Shareholders') {
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
    if (this.formName == 'Add Board Members' || this.formName == 'Add Directors' || this.formName == "Add Secretary" || this.formName == "Add Manager") {
      this.formHeader = 'Board Member Details';
      this.formRole = 'Director;Secretary;Manager';
      this.picklistOptions = [];
      this.shareHolderSelectedValue = 'Individual';
    }
    if (this.formName == 'Add Directors') {
      this.formHeader = 'Director Details';
      this.formRole = 'Director';
      this.picklistOptions = [];
      this.shareHolderSelectedValue = 'Individual';
    }
    /* if (this.formName == 'Add POA') {
       this.formHeader = 'Amendment details';
       this.formRole = 'POA';
       this.picklistOptions = [];
        this.shareHolderSelectedValue = 'Individual';
     } */
    if (this.formName == "Add Ultimate Beneficiary Owner") {
      this.formHeader = "Ultimate Beneficiary Owner";
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
    //this.showSpinner = true;
    this.stopNavigation = false;
    this.obrecordId = '';
    //this.maximumAllowed = await getAddBoardMembersData({requestId:this.serviceRequestId, role:this.formRole});
    console.log('actionTempId--->', this.actionTempId);
    console.log('this.currentFlowId--->', this.currentFlowId);
    console.log('this.serviceRequestId--->', this.serviceRequestId);

    let result = await getApplicationDetails({
      actionTempId: this.actionTempId,
      actionPageFlowId: this.currentFlowId,
      srId: this.serviceRequestId,
      empId: empId,
      isReadOnly: false
    });
    if (result) {
      this.sectionDetails = [];
      this.dependentPickListValues = [];
      this.picklistValues = [];
      this.fieldsGroupBy = {};

      let response = JSON.parse(result.response);
      this.menutext = result.templateRec[0].Menu_Text__c;
      this.formTemplatUniqueCode = result.templateRec[0].acbox__Unique_Code__c;
      //this.sObjects = response.recData;

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
      console.log('sectionDetails::' + JSON.stringify(this.sectionDetails));
      this.serviceRequestId = response.sr_Id;
      this.srRecordTypeId = response.srRecordTypeId;
      let fields = [];
      let tempFields = [];

      this.sObjects.Request_Type__c;

      /*first iteration to group common section fields
        for(var i=0;i < this.sectionDetails.length;i++){
          fields = this.sectionDetails[i].sectionDetails;
          
              
          for(var j=0;j<fields.length;j++){
            if(this.fieldsGroupBy.hasOwnProperty(fields[j].Name)){
              this.fieldsGroupBy[fields[j].Name] =  parseInt(this.fieldsGroupBy[fields[j].Name]) + 1;
            }
            else{
              this.fieldsGroupBy[fields[j].Name] = 1;
            }
          }
        }*/

      for (var i = 0; i < this.sectionDetails.length; i++) {
        // this.sectionDetails[i].section.isRenderByDefault = true;
        if (this.sectionDetails[i].section.acbox__Type__c == 'ShareholderType') {
          this.sectionDetails[i].section.isRenderByDefault = true;
        }
        else {
          this.sectionDetails[i].section.isRenderByDefault = false;
        }

        if (this.sectionDetails[i].section.acbox__Type__c == 'UBO_TREE_MAP') {
          this.sectionDetails[i].section.isRenderByDefault = false;
        }

        fields = this.sectionDetails[i].sectionDetails;

        for (var j = 0; j < fields.length; j++) {
          if (this.fieldsRenderByRule.includes(fields[j].acbox__Field_API_Name__c)) {
            fields[j].isRenderByDefault = false;
          } else {
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

          //work around to avoid onblur conflict between the picklist and other fields
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
            // if(this.sObjects[fields[j].acbox__Field_API_Name__c] && this.sObjects[fields[j].acbox__Field_API_Name__c]!=''){
            // fields[j].acbox__Default_Value__c = this.sObjects[fields[j].acbox__Field_API_Name__c] ? this.sObjects[fields[j].acbox__Field_API_Name__c] : "";
            //}
          }
          fields[j].colCount =
            this.sectionDetails[i].section.acbox__Columns__c != null &&
              fields[j].acbox__Field_type__c != "Blank"
              ? this.sectionDetails[i].section.acbox__Columns__c
              : 1;
          /*column count to specify width of the input fields
            if(this.fieldsGroupBy.hasOwnProperty(fields[j].Name)){
              fields[j].colCount = this.fieldsGroupBy[fields[j].Name] == 1 ?colCount: this.fieldsGroupBy[fields[j].Name];
            }*/

          if (fields[j].acbox__Type__c == "" || !fields[j].acbox__Type__c) {
            fields[j].showSectionDetail = true;
          } else if (this.isReadOnly && fields[j].acbox__Type__c == "Edit") {
            fields[j].showSectionDetail = false;
          } else if (!this.isReadOnly && fields[j].acbox__Type__c == "View") {
            fields[j].showSectionDetail = false;
          } else {
            fields[j].showSectionDetail = true;
          }
          /*if( fields[j].acbox__Field_type__c == 'Phone'){
            fields[j].isPhoneInput = true;
             fields[j].isCustomPlaceholder = true;
            if(fields[j].acbox__Default_Value__c !='' &&  fields[j].acbox__Default_Value__c!=null) {
             if(fields[j].acbox__Default_Value__c.includes('-')){
               let val  = fields[j].acbox__Default_Value__c.split('-');
               fields[j].acbox__Default_Value__c = val[1];
               fields[j].countryCode = val[0];
            }
            else{
              fields[j].countryCode = "";
            }
             
          }
          }
          else{
            fields[j].isPhoneInput = false;
          }*/
          //Added by Vinod
          // if(fields[j].acbox__Field_API_Name__c == 'Registration_Number__c' || fields[j].acbox__Field_API_Name__c == 'Trade_License_Number__c'){
          //    fields[j].isRenderByDefault = false;
          // }

          //output field check
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
            //this.sectionDetails[i].acbox__Default_Value__c = this.sObjects[fields[j].acbox__Field_API_Name__c];
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
            /*  if(childSectionDetails.acbox__Field_type__c == 'Phone'){
                  this.sectionDetails[i].sectionDetails[j].isPhoneInput = true;
                  this.sectionDetails[i].sectionDetails[j].isCustomPlaceholder = true;
              }
              else{
                  this.sectionDetails[i].sectionDetails[j].isPhoneInput = false;
              }*/

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
          //iterate section details of child object
          for (let s = 0; s < sectionDetails.length; s++) {
            let field = sectionDetails[s];
            //assign default values
            objectInstance.sectionDetails[s].acbox__Default_Value__c = result.responseChild[i][field.acbox__Field_API_Name__c] ?
              result.responseChild[i][field.acbox__Field_API_Name__c] : '';
            /*   if(field.acbox__Field_type__c == 'Phone' && field.acbox__Default_Value__c 
               && field.acbox__Default_Value__c !='' && field.acbox__Default_Value__c!=null) {
                 if( field.acbox__Default_Value__c.includes('-')){
                   let val  = field.acbox__Default_Value__c.split('-');
                   field.acbox__Default_Value__c = val[1];
                   field.countryCode = val[0];
                 }
                 else{
                   field.countryCode = "";
                 }
                
               }*/
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
    //first iteration to group common section fields
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
    //}
  }

  async refreshValues() {
    await notifyRecordUpdateAvailable([{ recordId: this.serviceRequestId }]);
    //updateRecord({ fields: { Id: this.serviceRequestId } });
  }

  async handleFormCancel(event) {
    this.showSpinner = true;
    try {
      await deleteDraftNodesForServiceRequest({
        serviceRequestId: this.serviceRequestId,
        objectApiName: 'OB_Amendment__c',
        rootAmendmentId: this.obrecordId // if you have it; else pass null
      });
    } catch (e) {
      console.error(e);
    }
    this.showShareHoldersForm = false;
    this.shareHolderSelectedValue = 'Individual';
    this.validationMessage = '';
    this.validationErrorMessage = '';
    this.hasRoleError = false;
    this.roleValidationMessage = '';
    this.uboRelationship = [];
    this.UBOAmendment = [];
    this.uboSectionDetail = [];
    this.isUBOTreeVisible = false;
    this.connectedCallback();
    event.stopPropagation();
  }

  removeDuplicateRoles(originalString) {
    // Convert the string into an array of characters, create a Set to remove duplicates, and join it back to a string
    let stringArray = originalString.split(';');
    let uniqueArray = [...new Set(stringArray)];
    let uniqueString = uniqueArray.join(';');
    return uniqueString;
  }

  //since the form submission has custom logic stopping default submission
  async handleFormSubmit() {
    this.showSpinner = true;
    this.hasError = false;
    this.validationMessage = '';
    this.validationErrorMessage = '';
    this.hasRoleError = false;
    this.roleValidationMessage = '';
    let fields = [];
    let validation = { validity: true, flowId: this.currentFlowId };
    const check = this.validateUboTreeAllLeavesAreIndividuals(this.uboRelationship);
    if (!check.ok) {
      this.showToast('error', check.message);
      this.showSpinner = false;
      return;
    }
    console.log('this.uploadedFileName--->' + this.documentName);
    // if(this.uploadedFileName == '' && this.shareHolderSelectedValue == 'Individual'){      
    //   this.showSpinner = false;
    //   validation.validity = false;
    //   validation.error = "Please upload the passport copy.";
    //   return validation;
    // }
    // if(this.uploadedFileName == '' && this.shareHolderSelectedValue == 'Corporate' && this.isDACCRegistered == false){      
    //   this.showSpinner = false;
    //   validation.validity = false;
    //   validation.error = "Please upload company trade license copy.";
    //   return validation;
    // }

    /*if(this.uploadedFileName == '' && !this.isDACCRegistered){      
      this.showSpinner = false;
      validation.validity = false;
      validation.error = "Please upload the passport copy.";
      return validation;
    }*/

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
      if (!isInputFieldValid) {
        this.showSpinner = false;
        return;
      }
      let totalUBOPercentage = 0;
      this.shareHoldersData.forEach(item => {
        if (item.Role__c.includes('UBO')) {
          console.log('item.Status_of_BO_Ownership__c--->' + item.Status_of_BO_Ownership__c);
          if (this.selectedMemberList != '') {
            if (item.Id != this.selectedMemberList[0].Id)
              totalUBOPercentage = totalUBOPercentage + item.Status_of_BO_Ownership__c;
          } else {
            totalUBOPercentage = totalUBOPercentage + item.Status_of_BO_Ownership__c;
          }
        }
      })
      this.uboOwnershipPercentage = totalUBOPercentage;
      console.log('this.uboOwnershipPercentage--->' + this.uboOwnershipPercentage);
      var sectionsUpdated = [];
      console.log('selectedMemberList::' + JSON.stringify(this.selectedMemberList));
      console.log('sectionDetails::' + JSON.stringify(this.sectionDetails));
      for (var i = 0; i < this.sectionDetails.length; i++) {
        /* if(this.sectionDetails[i].section.acbox__Is_Child__c){
           fields = this.sectionDetails[i].sectionDetails;
           console.log('fields--->'+fields);
            for (var j = 0; j < fields.length; j++) {
              for(var k = 0; k < this.selectedMemberList.length; k++){
                console.log('section details::'+fields[j].acbox__Field_API_Name__c+':'+this.selectedMemberList[0][fields[j].acbox__Field_API_Name__c]+':'+this.sObjects[fields[j].acbox__Field_API_Name__c]+':'+this.selectedMemberList[0][fields[j].acbox__Field_API_Name__c]);
                 if(this.selectedMemberList[0][fields[j].acbox__Field_API_Name__c] !== undefined && this.sObjects[fields[j].acbox__Field_API_Name__c] != this.selectedMemberList[0][fields[j].acbox__Field_API_Name__c]){
                   if(sectionsUpdated.indexOf(this.sectionDetails[i].section.Name)==-1)
                    sectionsUpdated.push(this.sectionDetails[i].section.Name);
                 }
              
               }
              
            }
            console.log('sectionsUpdated::'+JSON.stringify(sectionsUpdated));
        }
        else if (!this.sectionDetails[i].section.acbox__Is_Child__c) {
         */
        if (this.sectionDetails[i].section.acbox__Is_Child__c) {
          fields = this.sectionDetails[i].sectionDetails;
          for (var j = 0; j < fields.length; j++) {
            let fieldVal;
            if (this.sObjects.hasOwnProperty(fields[j].acbox__Field_API_Name__c)) {
              fieldVal = this.sObjects[fields[j].acbox__Field_API_Name__c];
              if (
                fieldVal &&
                typeof fieldVal === "string" &&
                fields[j].acbox__Field_type__c === "Text"
              ) {
                this.sObjects[fields[j].acbox__Field_API_Name__c] =
                  fieldVal.toUpperCase();
              }
            } else {
              let target = this.template.querySelector(`[data-id="${fields[j].acbox__Field_API_Name__c}"]`);
              if (target != null) {
                fieldVal = target.value();
                this.sObjects[fields[j].acbox__Field_API_Name__c] =
                  fieldVal &&
                    typeof fieldVal === "string" &&
                    fields[j].acbox__Field_type__c === "Text"
                    ? fieldVal.toUpperCase()
                    : fieldVal;
              }
            }
            /* Commented by Vinod if (
               (fields[j].acbox__Is_required__c &&
                 fields[j].acbox__Component_Type__c != "Output Field" &&
                 !fields[j].acbox__Is_Disable__c &&
                 (fieldVal == "" || fieldVal == null)) ||
               fields[j].hasError
             ) {
               fields[j].hasError = true;
               validation.validity = false;
             } */
            if (fieldVal != null && fieldVal != "") {
              //DOB validation
              if (fields[j].acbox__Field_API_Name__c == 'Date_Of_Birth__c' && this.formName != 'Add Shareholders') {
                let isDOBValid = this.handleDOBvalidation(fieldVal);
                if (!isDOBValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Age must be above 18 years.";
                }

                let isDOBHistoric = this.validateDatehistoric(fieldVal);
                if (!isDOBHistoric) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Historic dates are not acceptable.";
                }

              }

              //DOB validation
              if (fields[j].acbox__Field_API_Name__c == 'Date_Of_Birth__c' && this.formName == 'Add Shareholders') {
                let isDOBValid = this.handleDOBvalidationforShareholders(fieldVal);
                if (!isDOBValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Date of Birth can't be a future date or today's date.";
                }

                let isDOBHistoric = this.validateDatehistoric(fieldVal);
                if (!isDOBHistoric) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Historic dates are not acceptable.";
                }

                let isDOBValid1 = this.handleDOBvalidation(fieldVal);
                console.log('isDOBValid1--->' + isDOBValid1);
                if (!isDOBValid1) {
                  console.log('director--->', this.sObjects['Is_Director__c']);
                  if (this.sObjects['Is_Director__c'] == true || this.sObjects['Is_Manager__c'] == true || this.sObjects['Is_Secretary__c'] == true) {
                    fields[j].hasError = true;
                    validation.validity = false;
                    fields[j].errorMessage = "Director, General Manager or Secretary must be above 18 years.";
                  }
                }
              }

              //Passport expiry date validation
              if (fields[j].acbox__Field_API_Name__c == 'Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Expiry_Date__c') {
                let isPPExpiryDateValid = this.validatePassportExpiry(fieldVal);
                if (!isPPExpiryDateValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Expiry Date should be more than 6 months.";
                }

                let isPPExpiryDateHistoric = this.validateDatehistoric(fieldVal);
                if (!isPPExpiryDateHistoric) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Historic dates are not acceptable.";
                }

              }
              //Passport issue date validation  
              if (fields[j].acbox__Field_API_Name__c == 'Passport_Issued_Date__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Issue_Date__c') {
                let isPPIssueDateValid = this.validatePassportIssueDate(fieldVal);
                if (!isPPIssueDateValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Issue Date can't be a future date.";
                }

                let isPPIssueDateHistoric = this.validateDatehistoric(fieldVal);
                if (!isPPIssueDateHistoric) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Historic dates are not acceptable.";
                }
              }
              //Passport Number validation  
              if (fields[j].acbox__Field_API_Name__c == 'Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'Secondary_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'POC_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Number__c') {
                let isPassportNumberValid = this.validatePassportNumber(fieldVal);
                if (!isPassportNumberValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Please enter only alphanumeric, Special characters are not allowed.";
                }
              }
              //Place Of Birth validation  
              if (fields[j].acbox__Field_API_Name__c == 'Place_Of_Birth__c') {
                let isPlaceOfBirthValid = this.validatePlaceOfBirth(fieldVal);
                if (!isPlaceOfBirthValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Please enter only alphanumeric and whitespace, Special characters are not allowed.";
                }
              }
              //Mobile Number validation  
              if (fields[j].acbox__Field_API_Name__c == 'Primary_Mobile_Number__c') {
                let isMobileNumberValid = this.validateMobileNumber(fieldVal);
                if (!isMobileNumberValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Please enter mobile number in given format '+971XXXXXXXXX'.";
                }
              }
              //EID validation  
              if (fields[j].acbox__Field_API_Name__c == 'Emirates_ID__c') {
                let isEIDValid = this.validateEmiratesId(fieldVal);
                if (!isEIDValid) {
                  fields[j].hasError = true;
                  validation.validity = false;
                  fields[j].errorMessage = "Please enter valid Emirates Id in given format '784-XXXX-XXXXXXX-X'.";
                }
              }
              //Status of BO (Ownership %)
              if (fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c') {
                let isValid = this.validateStatusOfBOOwnership(fieldVal);
                if (!isValid) {
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

    //below condition added by Vinod error was throwing when license copy uploaded
    /*  if(this.formTemplatUniqueCode != 'CompanyRegistration'){
        if(this.isUpdateForm && sectionsUpdated.length == 0){
          this.hasError = true;
          this.validationMessage = 'Please update section details';
            this.showSpinner = false;
            return;
        }
      }
       if(this.formTemplatUniqueCode == 'UpdateManager' || this.formTemplatUniqueCode == 'UpdateDirector' || this.formTemplatUniqueCode == 'UpdateSecretary' || this.formTemplatUniqueCode == 'UpdateShareholder'){
          for(var i = 0; i < sectionsUpdated.length; i++){
             if(sectionsUpdated[i] == 'Passport Details' && this.updateSectionSelectedValue.indexOf('Passport')==-1)
               this.updateSectionSelectedValue.push('Passport');
             else if(sectionsUpdated[i] == 'Personal Details' && this.updateSectionSelectedValue.indexOf('Personal')==-1) 
               this.updateSectionSelectedValue.push('Personal'); 
             else if(sectionsUpdated[i] == 'PEP Details' && this.updateSectionSelectedValue.indexOf('PEP')==-1) 
               this.updateSectionSelectedValue.push('PEP');
             else if(sectionsUpdated[i] == 'Contact Details' && this.updateSectionSelectedValue.indexOf('ContactInfo')==-1) 
               this.updateSectionSelectedValue.push('ContactInfo');
             else if(sectionsUpdated[i] == 'Address' && this.updateSectionSelectedValue.indexOf('Address')==-1) 
               this.updateSectionSelectedValue.push('Address');      
           }
          console.log('updateSectionSelectedValue::'+JSON.stringify(this.updateSectionSelectedValue));
           
           this.sObjects['Updating_Section__c'] = this.updateSectionSelectedValue.join(',').replaceAll(',', ';');
           if(this.relAccountId && this.relAccountId != '')
            this.sObjects['Relationship_Account__c'] = this.relAccountId;
           if(this.relId && this.relId != '')
            this.sObjects['RelationShipId__c'] = this.relId; 
  
        }
        if(this.formName == 'AllMembers'){
          if(this.relAccountId && this.relAccountId != '')
            this.sObjects['Relationship_Account__c'] = this.relAccountId;
           if(this.relId && this.relId != '')
            this.sObjects['RelationShipId__c'] = this.relId; 
        } */
    if (this.formName == 'Add Board Members') {
      //console.log('Manager:'+this.sObjects['Is_Manager__c']+':Director:'+this.sObjects['Is_Director__c']+':Secretary:'+this.sObjects['Is_Secretary__c']);
      if (this.sObjects['Is_Manager__c'] == false && this.sObjects['Is_Director__c'] == false && this.sObjects['Is_Secretary__c'] == false) {
        this.hasError = true;
        this.validationErrorMessage = 'Please select atleast one board member role.';
        this.showSpinner = false;
        return;
      }
    }
    if (this.isSelectedShareholderType && !this.contentVersionId && !this.uploadedFileName && !this.skipDocUpload) {
      this.hasError = true;
      if (this.isCorporateShareholder) {
        if (this.sObjects['Place_of_Registration__c'] == 'a0KD0000008luCWMAY') {
          this.validationMessage = 'Please upload trade license copy';
        } else {
          this.validationMessage = 'Please upload good standing certificate copy';
        }
      }
      else {
        this.validationMessage = 'Please upload passport copy';
      }
      this.showSpinner = false;
      return;
    }
    // console.log('recId---->'+this.serviceRequestId+'---role--->'+this.sObjects['Role__c']+'---passportNumber--->'+this.sObjects['Passport_Number__c']+'---amendmentId--->'+this.sObjects['Id']);
    if (this.sObjects['Passport_Number__c'] != '') {
      this.duplicatecheck = await duplicateRecordCheck({ recId: this.serviceRequestId, role: this.sObjects['Role__c'], passportNumber: this.sObjects['Passport_Number__c'], amendmentId: this.sObjects['Id'] })
      // console.log('this.duplicatecheck---->'+this.duplicatecheck);
      if (this.duplicatecheck == true) {
        this.showSpinner = false;
        this.hasError = true;
        this.validationErrorMessage = "There is an already user exist with same passport number.";
        return;
      }
    }

    let totalUBOOwnership = parseFloat(this.uboOwnershipPercentage) + parseFloat(this.uboPercentage);
    console.log('totalUBOOwnership--->' + totalUBOOwnership);
    /* if(totalUBOOwnership > 100){
       this.showSpinner = false;
       this.hasError = true;
       this.validationErrorMessage = "Please ensure that the total Status of BO Percentage across all UBOs does not exceed 100%.";
       return;
     }*/
    console.log('validation.validity --->' + validation.validity);
    console.log('this.stopNavigation --->' + this.stopNavigation);
    if (validation.validity || this.stopNavigation) {
      this.sObjects["Action_Template__c"] = this.actionTempId;

      if (this.serviceRequestId != "") {
        this.sObjects["Id"] = this.serviceRequestId;
      }
      /*if (this.srRecordTypeId != "") {
        this.sObjects["RecordTypeId"] = this.srRecordTypeId;
      }*/
      try {
        // if (this.dirtyFlag) {

        for (var i = 0; i < this.listChild.length; i++) {
          this.listChild[i].sobjectType = this.childObjectName;
        }
        this.showShareHoldersForm = false;
        this.showPersonalInfo = false;
        this.showShareholdeTypeSection = false;
        //event.stopPropagation();
        console.log('this.obrecordId--->' + this.obrecordId);
        if (this.obrecordId !== undefined && this.obrecordId != '') {
          this.sObjects['Id'] = this.obrecordId;
        } else {
          delete this.sObjects['Id'];
          this.sObjects['Role__c'] = '';
        }
        if (this.formHeader !== undefined && this.formHeader != '') {
          // if(this.formTemplatetitle != 'Add / Remove Directors'){
          this.sObjects['Status__c'] = 'New';
          // }
          if (this.formName == 'Add Shareholders') {
            let roleStr = '';
            if (this.shareHolderSelectedValue == 'Individual') {
              roleStr = 'Shareholder;';
              if (this.sObjects['Is_Manager__c'] == true) {
                roleStr = roleStr + 'Manager;';
              }
              if (this.sObjects['Is_Director__c'] == true) {
                roleStr = roleStr + 'Director;';
              }
              if (this.sObjects['Is_Secretary__c'] == true) {
                roleStr = roleStr + 'Secretary;';
              }
              if (this.sObjects['Is_UBO__c'] == true) {
                roleStr = roleStr + 'UBO;';
              }
              roleStr = roleStr.slice(0, -1);
              this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
            } else if (this.shareHolderSelectedValue == 'Corporate') {
              roleStr = 'Shareholder;';
              if (this.sObjects['Is_UBO__c'] == true) {
                roleStr = roleStr + 'UBO;';
              }
              roleStr = roleStr.slice(0, -1);
              //this.sObjects['Role__c'] = roleStr;
              this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
            }
            this.sObjects['Shareholder_Type__c'] = this.shareHolderSelectedValue;
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }
          if (this.formName == 'Add Board Members') {
            let roleStr = '';
            if (this.sObjects['Role__c'] != null) {
              if (this.sObjects['Is_Director__c'] == true) {
                roleStr = roleStr + 'Director;';
              } else {
                roleStr = roleStr.replace('Director;', '');
                this.sObjects['Role__c'] = this.sObjects['Role__c'].replace('Director', '');
              }
              if (this.sObjects['Is_Secretary__c'] == true) {
                roleStr = roleStr + 'Secretary;';
              } else {
                roleStr = roleStr.replace('Secretary;', '');
                this.sObjects['Role__c'] = this.sObjects['Role__c'].replace('Secretary', '');
              }
              if (this.sObjects['Is_Manager__c'] == true) {
                roleStr = roleStr + 'Manager;';
              } else {
                roleStr = roleStr.replace('Manager;', '');
                this.sObjects['Role__c'] = this.sObjects['Role__c'].replace('Manager', '');
              }
              roleStr = roleStr.slice(0, -1);
              console.log('this.sObjects role 222 ----> ' + this.sObjects['Role__c']);
              console.log('roleStr 222--->' + roleStr);
              if (this.sObjects['Role__c'] != null) {
                roleStr = this.sObjects['Role__c'] + ';' + roleStr;
              }
            } else {
              if (this.sObjects['Is_Director__c'] == true) {
                roleStr = roleStr + 'Director;';
              }
              if (this.sObjects['Is_Secretary__c'] == true) {
                roleStr = roleStr + 'Secretary;';
              }
              if (this.sObjects['Is_Manager__c'] == true) {
                roleStr = roleStr + 'Manager;';
              }
              roleStr = roleStr.slice(0, -1);
            }

            this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }
          /* if(this.formName == 'Add Directors'){
             let roleStr = '';
             roleStr = 'Director;';
             if(this.sObjects['Is_Manager__c'] == true){
               roleStr = roleStr + 'Manager;';
             }else{
               roleStr = roleStr.replace('Manager;', '');
             }
             if(this.sObjects['Is_Secretary__c'] == true){
               roleStr = roleStr + 'Secretary;'; 
             }else{
               roleStr = roleStr.replace('Secretary', '');
             }
             roleStr = roleStr.slice(0, -1); 
             this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
             this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
           }*/
          if (this.formName == 'Add POA') {
            this.sObjects['Role__c'] = 'Contact Person';
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }
          if (this.formName == 'Add General Manager') {
            this.sObjects['Role__c'] = 'Manager';
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }
          if (this.formName == 'Add Ultimate Beneficiary Owner') {
            let roleStr = '';
            if (this.sObjects['Role__c'] != null) {
              console.log('inside loop');
              roleStr = this.sObjects['Role__c'] + ';' + 'UBO';
            } else {
              roleStr = 'UBO';
            }
            this.sObjects['Role__c'] = this.removeDuplicateRoles(roleStr);
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }
          if (this.formName == 'Add Secretary') {
            this.sObjects['Role__c'] = 'Secretary';
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }
          if (this.formName == 'Add Legal Representative') {
            this.sObjects['Role__c'] = 'Legal Representative';
            this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
          }


        }
        //console.log(JSON.stringify(this.sObjects));    
        // 
        // .then(response => {
        //   console.log('response====='+response);
        // this.duplicatecheck = true;
        // console.log('this.duplicatecheck====='+this.duplicatecheck);
        let parentExtId = this.sObjects['External_Id__c'];
        this.sObjects['External_Id__c'] = parentExtId ? parentExtId : this.nodeUniqueID ? this.nodeUniqueID : await getGUID();
        this.sObjects['UBO_JSON__c'] = this.uboRelationship && this.uboRelationship.length > 0 ? JSON.stringify(this.uboRelationship) : '';
        let deletedUBOJSON = this.deletedUBOIds ? JSON.stringify(this.uboRelationshipAfterDeleteUBO) : null;
      try {
         const newId = await createsObjectRecord({ record: this.sObjects, childUBO: this.UBOAmendment, contentVersionId: this.contentVersionId, deletedUBOJSON: deletedUBOJSON, deletedUBOIds: this.deletedUBOIds });
            this.obrecordId = newId;
            await this.commitUboGraphAfterShareholderSave(newId);
            //this.laRecordId = response;
            this.sectionDetails = [];
            this.showPersonalInfo = false;
            this.showShareholdeTypeSection = false;
            this.uboRelationship = [];
            this.UBOAmendment = [];
            this.uboSectionDetail = [];
            this.isUBOTreeVisible = false;
            this.UBOAmendment = [];
            this.deletedUBOIds = [];
            this.nodeUniqueID = '';
            this.sObjects = { sobjectType: this.objectApiName };
            //this.getFormDetails();
            //this.getFromData();
            this.connectedCallback();

          }catch(error) {
            // Handle error
            console.error('Error: ', error);
            this.showPersonalInfo = false;
            this.showShareholdeTypeSection = false;
          };
        /*}else{
          // console.log('update called----');
          // updateAmendmentRecord({ record: this.sObjects, contentVersionId: this.contentVersionId, role: this.sObjects['Role__c']})
          // .then(response => {
          //   this.laRecordId = response;
          //   this.sectionDetails = [];
          //   this.connectedCallback();
          // })
          // .catch(error => {
          //   // Handle error
          //   console.error('Error: ', error);
          // });
          validation.validity = false;
          this.showSpinner = false;
          validation.error = "We have a Active record present with the given data. Duplicate Records are not allowed";
          console.log( 'Error Message'+validation.error);
        }*/
        // })
        // .catch(error => {
        //   console.error('Error: ', error);
        // });
        /* if(!this.duplicatecheck){
           console.log('inside if');
           createsObjectRecord({ record: this.sObjects, contentVersionId: this.contentVersionId })
           .then(response => {
             //this.laRecordId = response;
             this.sectionDetails = [];
             //this.getFormDetails();
             //this.getFromData();
             this.connectedCallback();
   
           })
           .catch(error => {
             // Handle error
             console.error('Error: ', error);
           });
             // }
         }else{
           console.log('inside else');
           updateAmendmentRecord({ record: this.sObjects, contentVersionId: this.contentVersionId, role: this.sObjects['Role__c']})
           .then(response => {
             //this.laRecordId = response;
             //this.sectionDetails = [];
             this.connectedCallback();
           })
           .catch(error => {
             // Handle error
             console.error('Error: ', error);
           });
           // validation.validity = false;
           // this.showSpinner = false;
           // validation.error = "We have a Active record present with the given data.Duplicate Records are not allowed";
           // console.log( 'Error Message'+validation.error);
         }*/
        // }
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
    //this.showSpinner = false;
    console.log('validation--->' + JSON.stringify(validation));
    return validation;

    // this.showShareHoldersForm = false;
    // event.stopPropagation();
    // if (this.obrecordId !== undefined && this.obrecordId != '') {
    //   this.sObjects['Id'] = this.obrecordId;

    // }else{
    //   delete this.sObjects['Id'];
    // }
    // if (this.formHeader !== undefined && this.formHeader != '') {
    //   // if(this.formTemplatetitle != 'Add / Remove Directors'){
    //     this.sObjects['Status__c']='New';
    //  // }
    //   if (this.formName == 'Add Shareholders') {
    //     this.sObjects['Role__c'] = 'Shareholder';
    //   }
    //   if (this.formName == 'Add Directors') {
    //     this.sObjects['Role__c'] = 'Director';
    //     this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
    //   }
    //   if (this.formName == 'Add Ultimate beneficiary Owner') {
    //     this.sObjects['Role__c'] = 'UBO';
    //     this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
    //   }
    //    if (this.formName == 'Add Secretary') {
    //     this.sObjects['Role__c'] = 'Secretary';
    //     this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
    //   }
    //   if (this.formName == 'Add Legal Representative') {
    //     this.sObjects['Role__c'] = 'Legal Representative';
    //     this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
    //   }

    // }
    // console.log(JSON.stringify(this.sObjects));
    // createsObjectRecord({ record: this.sObjects, contentVersionId: this.contentVersionId })
    //   .then(response => {
    //     this.laRecordId = response;
    //     this.sectionDetails = [];
    //     this.getFormDetails();
    //     this.getFromData();

    //   })
    //   .catch(error => {
    //     // Handle error
    //     console.error('Error: ', error);
    //   });
    //event.preventDefault();

  }
  //  checkDuplicateRecords(){
  //   duplicateRecordCheck({recId: this.serviceRequestId,role: this.sObjects['Role__c'], passportNumber: this.sObjects['Passport_Number__c'],emailAddress: this.sObjects['EmailAddress__c']})
  //   .then(response => {
  //     console.log('response====='+response);
  //     this.duplicatecheck =response;
  //     console.log('this.duplicatecheck====='+this.duplicatecheck);
  //   })
  //   .catch(error => {
  //     console.error('Error: ', error);
  //   });
  // }
  handleUploadFinished(event) {
    // this.picklistOptions.forEach(obj =>{
    //     if(obj['value'] == this.shareHolderSelectedValue){
    //       obj['checked'] = 'checked';
    //     }
    // })
    this.validationMessage = '';
    const uploadedFiles = event.target.files;
    if (this.shareHolderSelectedValue == 'Individual') {
      this.showPPSpinner = true;
    } else {
      this.showSpinner1 = true;
    }

    const file = uploadedFiles[0];
    const fileSizeLimit = 2 * 1024 * 1024; // 2MB in bytes
    if (file.size > fileSizeLimit) {
      alert("File size exceeds 2MB limit. Please choose a smaller file.");
      this.showPPSpinner = false;
      this.showSpinner1 = false;
      event.target.value = null;
      return;
    }
    const reader = new FileReader();
    if (file) {
      reader.onloadend = this.handleFileRead.bind(this);
      reader.readAsDataURL(file);
    }
    // Access the ContentDocumentId of the uploaded file
    const contentDocumentId = uploadedFiles[0].documentId;
    const fileName = uploadedFiles[0].name;
    if (this.isCorporateShareholder) {
      if (this.sObjects['Place_of_Registration__c'] == 'a0KD0000008luCWMAY') {
        this.uploadedFileName = 'TradeLicenseCopy';
      } else {
        this.uploadedFileName = 'GoodStandingCertificateCopy';
      }
    } else {
      this.uploadedFileName = 'PassportCopy';
    }
    //this.uploadedFileName = fileName;
    console.log('contentDocumentId--->', contentDocumentId);
    console.log('this.uploadedFileName--->' + this.uploadedFileName);
    this.upload(file);

  }

  handleFileRead(event) {
    const reader = event.target;
    this.fileUpHyperlink = reader.result;
  }

  async upload(file) {
    const content = await this.readFileAsync(file);
    console.log('this.uploadedFileName---->' + this.uploadedFileName);
    const fileName = this.uploadedFileName + '.' + file.name.split('.').pop();
    console.log('fileName--->' + fileName);
    this.documentName = fileName;
    const recordInput = {
      apiName: 'ContentVersion',
      fields: {
        Title: fileName,
        PathOnClient: '/' + fileName,
        VersionData: content // Attaching file to the provided record Id
      }
    };

    try {
      // this.showSpinner = true;
      const result = await createRecord(recordInput);
      console.log(result);
      this.contentVersionId = result.id;
      if (!this.isCorporateShareholder && this.contentVersionId && (this.obrecordId === undefined || this.obrecordId == '')) {
        this.showPPSpinner = true;
        getDocumentOCR({ conVersionID: this.contentVersionId }).then(response => {
          response = JSON.parse(response);
          if (response != null) {
            this.populateDataFromOCR(response);
          }
          this.showPPSpinner = false;
          //this.showPersonalInfo = true;
          // this.showSpinner = false;
        })
          .catch(error => {
            // Handle error
            console.error('Error getDocumentOCR: ', error);
            this.showSpinner = false;
            this.showPPSpinner = false;
            //this.showPersonalInfo = true;
            this.showShareholdeTypeSection = false;
          });

      } else {
        this.showSpinner1 = false;
        this.showPersonalInfo = true;
        this.showShareholdeTypeSection = false;
        this.showSpinner = false;
        this.showPPSpinner = false;
        console.log('selected-->' + JSON.stringify(this.sectionDetails));
        this.sectionDetails.forEach(item => {
          if (!item.section.acbox__Type__c || item.section.acbox__Type__c == 'ShareholderType' || item.section.acbox__Type__c == this.shareholderType) {
            item.section.isRenderByDefault = true;
            if (item.section.Name == 'Roles - Corporate') {
              var fields = item.sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if (fields[j].acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c') {
                  fields[j].isRenderByDefault = false;
                  fields[j].acbox__Default_Value__c = '';
                  this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
                }
              }
            }
          } else {
            item.section.isRenderByDefault = false;
          }
        })
        /*  updatesObjectRecord({ recid: this.obrecordId, contentVersionId: this.contentVersionId}).then(response => {
            console.log('response else--->'+JSON.stringify(response));
            if(response.Full_Name__c && response.Full_Name__c !==''){
              this.documentName = response.Full_Name__c;
            }
            if(response.Document_Link__c && response.Document_Link__c !==''){
              this.documentURL = response.Document_Link__c;
              this.uploadedFileName = response.Document_Link__c;
            }
           // this.populateDataFromOCR(response);
            this.showSpinner = false;
            
          })
          .catch(error => {
            // Handle error
            console.error('Error: ', error);
            this.showSpinner = false;
            this.showPPSpinner = false;
          }); */
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

  getRelatedData() {
    // console.log('form Role--->'+this.formRole);
    // console.log('from name--->'+this.formTemplatetitle);
    let relatedRecords = [];
    return getRelatedRecords({ onboardRecordId: this.serviceRequestId })
      .then(result => {
        // console.log('result 2420--->'+JSON.stringify(result));
        result.forEach((item) => {
          console.log('item--->' + item);
          // if(item.Owner_Type__c == 'Individual'){
          relatedRecords.push({
            dataFor: "action",
            status: 'New',
            recId: item.Id,
            role: item.Role__c,
            passportNumber: item.Passport_Number__c,
            serviceRequestID: this.serviceRequestId,
            actionTemplateId: this.actionTempId,
            componentName: this.formTemplatetitle,
            btnTitle: "Add Member",
            showDeleteBtn: false,
            showEditBtn: false,
            showSelectBtn: true,
            selectBtnLbl: "Add Member",
            stylecss: 'flex: 0 0 10%;',
            values: [
              {
                text: item.Full_Name__c,
                isDate: false,
                isNumber: false,
                isText: true,
                stylecss: 'flex: 0 0 30%;',
              },
              {
                text: item.Passport_Number__c,
                isDate: false,
                isNumber: false,
                isText: true,
                stylecss: 'flex: 0 0 30%;',
              },
              {
                text: item.Role__c.includes('Manager') ? item.Role__c.replace('Manager', 'General Manager') : item.Role__c,
                isDate: false,
                isNumber: false,
                isText: true,
                stylecss: 'flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;',
              }
            ],
          });
          // }
        });
        // console.log('relatedRecords--->'+this.relatedRescord);
        // this.relatedRecords = relatedRecords;
        // this.shareHolderData = this.relatedRecords;
        return relatedRecords;
        //this.showChoosefromPeople = this.relatedRecords.length > 0 ? true : false;
      })
      .catch(error => {
        console.error('Error calling Apex method:', error);
      });
  }

  getSelectedRelationInfo() {
    let existingRecords = [];
    //console.log('this.serviceRequestRecord--->'+JSON.stringify(this.serviceRequestRecord));
    this.accId = this.serviceRequestRecord.Account_Name__c;
    //console.log('accId--->'+accId);
    return getSelectedRelationInfo({ relationId: this.accId })
      .then(result => {
        //console.log('result 2611--->'+JSON.stringify(result));
        result.forEach((item) => {
          existingRecords.push({
            dataFor: "action",
            status: 'Active',
            recId: item.Id,
            passportNumber: item.Passport_Number__c,
            serviceRequestID: this.serviceRequestId,
            actionTemplateId: this.actionTempId,
            componentName: this.formTemplatetitle,
            btnTitle: "Add Member",
            showDeleteBtn: false,
            showEditBtn: false,
            showSelectBtn: true,
            selectBtnLbl: "Add Member",
            stylecss: 'flex: 0 0 10%;',
            values: [
              {
                text: item.Full_Name__c,
                isDate: false,
                isNumber: false,
                isText: true,
                stylecss: 'flex: 0 0 30%;',
              },
              {
                text: item.Passport_Number__c,
                isDate: false,
                isNumber: false,
                isText: true,
                stylecss: 'flex: 0 0 30%;',
              },
              {
                text: item.Role__c == 'Manager' ? 'General Manager' : item.Role__c,
                isDate: false,
                isNumber: false,
                isText: true,
                stylecss: 'flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;',
              }
            ],
          });
        });
        console.log('existingRecords--->' + existingRecords);
        // this.existingRecords = existingRecords;
        return existingRecords;
        /*let passportNumber;  
         this.existingRecords.forEach(item => {
           console.log('Item Record--->'+JSON.stringify(item.passportNumber));
           passportNumber = item.passportNumber;
         });
         console.log('passportNumber---->'+passportNumber);
         this.relatedRecords.forEach(item => {
           console.log('related item passport number--->'+item.passportNumber);
           if(item.passportNumber === passportNumber){
               this.isAmendmentCreated = true;
           }
         });
         console.log('this.isAmendmentCreated---->'+this.isAmendmentCreated);  
         console.log('this.existingRecords---->'+this.existingRecords);        
         if(this.isAmendmentCreated == true){         
           this.showChoosefromExisting = false;
         }else{
           this.showChoosefromExisting = this.existingRecords.length > 0 ? true : false;
         } */
      })
      .catch(error => {
        console.error('Error calling Apex method:', error);
      });
  }
  /*
    async getSelectedRelationInfo(){
        let existingRecords = [];
        //console.log('this.serviceRequestRecord--->'+JSON.stringify(this.serviceRequestRecord));
        this.accId = this.serviceRequestRecord.Account_Name__c;
        //console.log('accId--->'+accId);
        getSelectedRelationInfo({relationId: this.accId})
         .then(result => {
            //console.log('result 2611--->'+JSON.stringify(result));
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
          //console.log('existingRecords--->'+this.existingRecords);
          this.existingRecords = existingRecords;
          let passportNumber;  
          this.existingRecords.forEach(item => {
            console.log('Item Record--->'+JSON.stringify(item.passportNumber));
            passportNumber = item.passportNumber;
          });
          console.log('passportNumber---->'+passportNumber);
          this.relatedRecords.forEach(item => {
            console.log('related item passport number--->'+item.passportNumber);
            if(item.passportNumber === passportNumber){
                this.isAmendmentCreated = true;
            }
          });
          console.log('this.isAmendmentCreated---->'+this.isAmendmentCreated);  
          console.log('this.existingRecords---->'+this.existingRecords);        
          if(this.isAmendmentCreated == true){         
            this.showChoosefromExisting = false;
          }else{
            this.showChoosefromExisting = this.existingRecords.length > 0 ? true : false;
          }       
         })
         .catch(error => {
          console.error('Error calling Apex method:', error);
        });
    }
    */
  /*async getExistingDirectorsData() {
 
     getExistingDirectorsFromAccount({recordId: this.serviceRequestId})
     .then(result => {
 
         var tempList= result.relationshipList.map(record => ({
         Id: record.Id,
         Name: record.Director__r.Name,
         Status:record.Director_Status__c,
         PassportNumber:record.Director__r.Passport_No__c,
         Role: record.Roles__c,
         ownerType : record.Director__r.Owner_Type__pc,
         RelationshipAccId : record.Director__c
         }));
         
       this.activeDirectorListfromAccount=tempList;
       var tempList=this.activeDirectorListfromAccount;
       var listdir=[];
       if(this.directorsData && this.directorsData.length>0){
        for(var itr of this.directorsData){
         listdir.push(itr.RelationShipId__c);
        }
       }
       console.log('listdir----'+JSON.stringify(listdir));
       console.log('isUpdateForm::'+this.isUpdateForm+' formTemplatUniqueCode::'+this.formTemplatUniqueCode);
       var finalListDir=[];
       var finalListAccIdDir=[];
       var finalOthRoleListDir=[];
       for(var itr of tempList){
         if(this.formName == 'AllMembers' ||  this.formRole == itr.Role){
          if(listdir.indexOf(itr.Id)==-1)
           finalListDir.push(itr);
          if(finalListAccIdDir.indexOf(itr.RelationshipAccId)==-1)
           finalListAccIdDir.push(itr.RelationshipAccId);
         }
         else{
           if(listdir.indexOf(itr.Id)==-1)
            finalOthRoleListDir.push(itr);
         }
       }
        for(var accid of finalListAccIdDir){
         finalOthRoleListDir = finalOthRoleListDir.filter(itm => itm.RelationshipAccId !== accid);
       }
       console.log('finalListDir::'+JSON.stringify(finalListDir));
       this.activeDirectorListfromAccount=finalListDir;
       this.requestActions = [];
       if(this.activeDirectorListfromAccount){
       console.log('activeDirectorListfromAccount::'+this.activeDirectorListfromAccount.length==0);
       this.activeDirectorListfromAccount.forEach((item) => {
         if(this.formName == 'AllMembers'){
           this.requestActions.push({
           dataFor: "action",
           status: item.Status,
           recId: item.Id,
           relAccId: item.RelationshipAccId,
           serviceRequestID:  this.serviceRequestId,
           actionTemplateId: this.actionTempId,
           componentName: this.formTemplatetitle,
           btnTitle : "Edit Member details",
           showEditBtn : (this.isUpdateForm == false) ? false :  true,
           showDeleteBtn: (this.isUpdateForm == true) ? false :  true,
           deletBtnLbl : 'Delete Member',
           eidtBtnLbl : 'Update Member',
           values: [
             {
               text: item.Name,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.PassportNumber,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.Role,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.Email,
               isDate: false,
               rowStatusClass: "",
             },{
               text: item.MobileNo,
               isDate: false,
               rowStatusClass: "",
             }
           ],
         });
         }
         else{
           this.requestActions.push({
           dataFor: "action",
           status: item.Status,
           recId: item.Id,
           relAccId: item.RelationshipAccId,
           serviceRequestID:  this.serviceRequestId,
           actionTemplateId: this.actionTempId,
           componentName: this.formTemplatetitle,
           btnTitle : "Edit Member details",
           showEditBtn : (this.isUpdateForm == false) ? false :  true,
           showDeleteBtn: (this.isUpdateForm == true) ? false :  true,
           deletBtnLbl : 'Delete Member',
           eidtBtnLbl : 'Update Member',
           values: [
             {
               text: item.Name,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.PassportNumber,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.Role,
               isDate: false,
               rowStatusClass: "",
             }
           ],
         });
         }
         
       });
       console.log('requestActions::'+JSON.stringify(this.requestActions));
     }
     this.relatedRelRecords = [];
     if(finalOthRoleListDir){
       
       console.log('finalOthRoleListDir::'+JSON.stringify(finalOthRoleListDir));
       finalOthRoleListDir.forEach((item) => {
         if(item.ownerType && item.ownerType == 'Individual'){
         this.relatedRelRecords.push({
           dataFor: "action",
           status: item.Status,
           isSelected : false,
           recId: item.Id,
           relAccId: item.RelationshipAccId,
           serviceRequestID:  this.serviceRequestId,
           actionTemplateId: this.actionTempId,
           componentName: this.formTemplatetitle,
           showDeleteBtn: false,
           btnTitle : "Add Member",
           showEditBtn : true,
           showSelectBtn : false,
           selectBtnLbl : "Add Member",
           values: [
             {
               text: item.Name,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.PassportNumber,
               isDate: false,
               rowStatusClass: "",
             },
             {
               text: item.Role,
               isDate: false,
               rowStatusClass: "",
             }
           ],
         });
         }
       });
       console.log('relatedRelRecords::'+JSON.stringify(this.relatedRelRecords));
     }
       
 
       console.log('getExistingDirectorsFromAccount----'+JSON.stringify(this.activeDirectorListfromAccount));
       console.log(this.activeDirectorListfromAccount.length);
       
       if((this.formTemplatUniqueCode == 'AddorRemovePOA' ||  this.formTemplatUniqueCode == 'AddorRemoveDirector' || this.formTemplatUniqueCode == 'AddorRemoveSecretary' || this.formTemplatUniqueCode == 'AddorRemoveManager'  || this.formTemplatUniqueCode == 'UpdateManager' || this.formTemplatUniqueCode == 'UpdateDirector' || this.formTemplatUniqueCode == 'UpdateSecretary' || this.formTemplatUniqueCode == 'UpdateShareholder' || this.formTemplatUniqueCode == 'UpdateContactInformation') && this.activeDirectorListfromAccount && this.activeDirectorListfromAccount.length>0){
         this.showexistingDirectors =true;
         this.showShareHoldersForm = false;
        
 
       }else if(this.activeDirectorListfromAccount && this.activeDirectorListfromAccount.length==0){
         this.showexistingDirectors =false;
          this.showShareHoldersForm = false;
       }
       console.log('in getexisting dire form===='+this.showShareHoldersForm);
      })
 
     .catch(error => {
       console.error('Error calling Apex method:', error);
     });
   }*/
  getFromData() {
    this.showSpinner = true;
    getExistingShareHoldersData({ onboardRecordId: this.serviceRequestId, role: this.formRole })
      .then(result => {
        console.log('Result--->' + JSON.stringify(result));
        if (result != null) {
          this.existingData = result;
          if (this.formName == 'Add Shareholders') {
            this.addBtnlabel = 'Add Shareholder';
            this.dataTableName = 'Shareholders';
            //this.showDirectorData = false;
            //this.shareHoldersAllData = result;
            this.shareHoldersData = result;
            /* result.forEach(function (el, i) {
               if(el.Owner_Type__c !== undefined && el.Owner_Type__c == 'Individual') {
                 individualData.push(el);
               } else if(el.Owner_Type__c !== undefined && el.Owner_Type__c == 'Corporate') {
                 corporateData.push(el);
               }
             })
             console.log('individualData--->'+JSON.stringify(individualData));
             console.log('corporateData--->'+corporateData);
             this.sharedHoldersCorporateData = corporateData;
             this.sharedHoldersIndividualData = individualData;
             */
            console.log('shareHoldersData--->' + this.shareHoldersData);
            if (this.shareHoldersData.length === 0) {
              this.showShareHoldersForm = true;
            } else {
              this.showShareHoldersForm = false;
              this.showPersonalInfo = false;
              this.showShareholdeTypeSection = false;
            }
          }
          /* else if (this.formName == 'Update Shareholders') {
            this.addBtnlabel = 'Add Shareholder';
            this.dataTableName = 'Amendments';
            this.formHeader = 'Amendment details';
            console.log(JSON.stringify(result));
            this.directorsData = result;
  
            if (result.length > 0) {
              this.showShareHoldersForm = false;
              this.showDirectorData = true;
            } else {
              this.showShareHoldersForm = true;
              if(this.formTemplatUniqueCode == 'UpdateShareholder'){
                this.showShareHoldersForm = false;
              }
              
              this.showDirectorData = false;
            }
            //this.showShareHoldersData = false;
            this.sharedHoldersIndividualData = [];
            this.sharedHoldersCorporateData = [];
          } */
          else if (this.formName == 'Add Board Members') {
            this.addBtnlabel = 'Add Board Members';
            this.dataTableName = 'Board Members';
            console.log(JSON.stringify(result));
            this.directorsData = result;
            if (result.length > 0) {
              this.showShareHoldersForm = false;
              //this.showDirectorData = true;
            } else {
              this.showShareHoldersForm = true;
              //this.showDirectorData = false;
            }
            this.shareHoldersData = [];
          }
        /* else if (this.formName == 'Add Directors') {
          this.addBtnlabel = 'Add Director';
          this.dataTableName = 'Directors';
          console.log(JSON.stringify(result));

          this.directorsData = result;
          if(result.length > 0) {
            this.showShareHoldersForm = false;
            //this.showDirectorData = true;
          } else {
            this.showShareHoldersForm = true;
            //this.showDirectorData = false;
          }
          /*for(var itr of this.directorsData){
              itr.isActive = itr.Status__c == 'Remove' ? true : false;
          }*.
        /*  
          if(result.length > 0) {
            this.showShareHoldersForm = false;
            if(this.formTemplatUniqueCode == 'AddorRemoveDirector' || this.formTemplatUniqueCode == 'UpdateDirector'){
              this.addBtnlabel='Add';
              this.dataTableName = 'Amendments';
              this.formHeader = 'Amendment details';
              this.relationsdataTableName = 'Existing Directors';
            }
            this.showDirectorData = true;
          } else {
            this.showShareHoldersForm = true;
            if(this.formTemplatUniqueCode == 'AddorRemoveDirector' || this.formTemplatUniqueCode == 'UpdateDirector'){
              this.showShareHoldersForm = false;
              this.addBtnlabel='Add';
            }
            this.showDirectorData = false;
          }
          /
          console.log('in get form===='+this.showShareHoldersForm);
          //this.showShareHoldersData = false;
          //this.sharedHoldersIndividualData = [];
         // this.sharedHoldersCorporateData = [];
          this.shareHoldersData = [];
        }*/ else if (this.formName == "Add Ultimate Beneficiary Owner") {
            this.dataTableName = 'Ultimate Beneficiary Owner';
            this.addBtnlabel = 'Add UBO';
            console.log(JSON.stringify(result));
            this.directorsData = result;
            if (result.length > 0) {
              this.showShareHoldersForm = false;
              //this.showDirectorData = true;
            } else {
              this.showShareHoldersForm = true;
              //this.showDirectorData = false;
            }
            // this.sharedHoldersIndividualData = [];
            // this.sharedHoldersCorporateData = [];
            this.shareHoldersData = [];
          }/* else if (this.formName == 'Add Secretary') {
          this.addBtnlabel = 'Add Secretary';
          this.dataTableName = 'Secretary';
          console.log(JSON.stringify(result));
          this.directorsData = result;
          if (result.length > 0) {
            this.showShareHoldersForm = false;
            // if(this.formTemplatUniqueCode == 'AddorRemoveSecretary' || this.formTemplatUniqueCode == 'UpdateSecretary'){
            //   this.addBtnlabel='Add';
            //   this.dataTableName = 'Amendments';
            //   this.formHeader = 'Amendment details';
            //   this.relationsdataTableName = 'Existing Secretary';
            // }
            //this.showDirectorData = true;
          } else {
            this.showShareHoldersForm = true;
            // if(this.formTemplatUniqueCode == 'AddorRemoveSecretary' || this.formTemplatUniqueCode == 'UpdateSecretary'){
            //   this.showShareHoldersForm = false;
            //   this.addBtnlabel='Add';
            // }
            //this.showDirectorData = false;
          }
          //this.showShareHoldersData = false;
         // this.sharedHoldersIndividualData = [];
         // this.sharedHoldersCorporateData = [];
          this.shareHoldersData = [];
        }*/
          /* else if (this.formName == 'Add POA') {
             this.addBtnlabel = 'Add POA';
             this.dataTableName = 'Amendments';
             this.formHeader = 'Amendment details';
             console.log(JSON.stringify(result));
             this.directorsData = result;
   
             if (result.length > 0) {
               this.showShareHoldersForm = false;
               if(this.formTemplatUniqueCode == 'AddorRemovePOA'){
                 this.addBtnlabel='Add POA';
                 this.relationsdataTableName = 'Existing POA';
               }
               this.showDirectorData = true;
             } else {
               this.showShareHoldersForm = true;
               if(this.formTemplatUniqueCode == 'AddorRemovePOA'){
                 this.showShareHoldersForm = false;
                 this.addBtnlabel='Add';
               }
               this.showDirectorData = false;
             }
             //this.showShareHoldersData = false;
             this.sharedHoldersIndividualData = [];
             this.sharedHoldersCorporateData = [];
           }*/
          /* else if (this.formName == 'Add General Manager') {
             this.addBtnlabel = 'Add General Manager';
             this.dataTableName = 'General Manager';
             console.log(JSON.stringify(result));
             this.directorsData = result;
   
             if (result.length > 0) {
               this.showShareHoldersForm = false;
              /*if(this.formTemplatUniqueCode == 'AddorRemoveManager' || this.formTemplatUniqueCode == 'UpdateManager'){
                 this.addBtnlabel='Add';
                  this.dataTableName = 'Amendments';
                  this.formHeader = 'Amendment details';
                  this.relationsdataTableName = 'Existing Manager';
               }
               //this.showDirectorData = true;
             } else {
               this.showShareHoldersForm = true;
              /* if(this.formTemplatUniqueCode == 'AddorRemoveManager' || this.formTemplatUniqueCode == 'UpdateManager'){
                 this.showShareHoldersForm = false;
                 this.addBtnlabel='Add';
               }
              // this.showDirectorData = false;
             }
             //this.showShareHoldersData = false;
            // this.sharedHoldersIndividualData = [];
            // this.sharedHoldersCorporateData = [];
             this.shareHoldersData = [];
           }*/
          /* else if (this.formName == 'Add Legal Representative') {
             this.addBtnlabel = 'Add Legal Representative';
             this.dataTableName = 'Legal Representative';
             console.log(JSON.stringify(result));
             this.directorsData = result;
   
             if (result.length > 0) {
               this.showShareHoldersForm = false;
               //this.showDirectorData = true;
             } else {
               this.showShareHoldersForm = true;
              //this.showDirectorData = false;
             }
             //this.showShareHoldersData = false;
            // this.sharedHoldersIndividualData = [];
            // this.sharedHoldersCorporateData = [];
             this.shareHoldersData = [];
           } */
          if (this.directorsData.length > 0) {
            this.membersData = [];
            this.directorsData.forEach((item) => {
              this.membersData.push({
                dataFor: "action",
                status: item.Status__c,
                recId: item.Id,
                role: item.Role__c,
                relAccId: item.Relationship_Account__c,
                serviceRequestID: this.serviceRequestId,
                actionTemplateId: this.actionTempId,
                componentName: this.formTemplatetitle,
                btnTitle: "Edit details",
                showEditBtn: (item.Status__c == 'Remove' || item.Status__c == 'Existing') ? false : true,
                showDeleteBtn: true,
                deletBtnLbl: 'Remove from Amendments',
                eidtBtnLbl: 'Edit Details',
                stylecss: 'flex: 0 0 10%;',
                values: [
                  {
                    text: item.Full_Name__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 30%;',
                  },
                  {
                    text: item.Passport_Number__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 20%;',
                  },
                  {
                    text: item.Role__c == 'Manager' ? 'General Manager' : item.Role__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;',
                  },
                  {
                    text: item.Status__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 10%;',
                  }
                ],
              });
            });
            //console.log('membersData::'+JSON.stringify(this.membersData));
          } else if (this.shareHoldersData.length > 0) {
            this.showShareCapital = true;
            this.shareCapital = this.shareHoldersData[0].Onboard_Request__r.Share_Capital__c.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
            console.log('this.shareCapital--->' + this.shareCapital);
            this.shareHolderMembersData = [];
            this.shareHoldersData.forEach((item) => {
              // console.log('item--->'+JSON.stringify(item));
              this.shareHolderMembersData.push({
                dataFor: "action",
                status: item.Status__c,
                recId: item.Id,
                relAccId: item.Relationship_Account__c,
                serviceRequestID: this.serviceRequestId,
                actionTemplateId: this.actionTempId,
                componentName: this.formTemplatetitle,
                btnTitle: "Edit Member details",
                role: item.Role__c,
                showEditBtn: (item.Status__c == 'Remove' || item.Status__c == 'Existing') ? false : true,
                showDeleteBtn: true,
                stylecss: 'flex: 0 0 7%;',
                values: [
                  {
                    text: item.Full_Name__c, //(item.Owner_Type__c == 'Corporate' && item.DACC_Registered__c == 'Yes') ? item.Corporate_Account__r.Name : item.Full_Name__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 20%;',
                  },
                  {
                    text: item.Owner_Type__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 10%;',
                  },
                  {
                    text: item.No_of_shares__c,
                    isDate: false,
                    isNumber: true,
                    isText: false,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 10%;',
                  },
                  {
                    text: item.Ownership_Percentage__c + ' %',
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 15%;',
                  },
                  {
                    text: this.formattedRoles(item.Role__c),//added by manoj to convert role in html formatted   //item.Role__c.includes('Manager') ? item.Role__c.replace('Manager', 'General Manager') : item.Role__c,
                    isDate: false,
                    isNumber: false,
                    isText: false,
                    isHTML: true, //added by manoj to display in html formatted
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 15%;', //'flex: 0 0 30%; word-break: break-word; white-space: break-spaces; max-width: 200px;',              
                    cssClassForHtmlVal: 'cssCls-' + item.Id, // added by manoj... its mandotry if you make isHTML true in values
                  },
                  /* {
                     text: item.Status_of_BO_Ownership__c+' %',
                     isDate: false,
                     isNumber : false,
                     isText : true,
                     rowStatusClass: "",
                     stylecss : 'flex: 0 0 10%;',
                   },*/
                  {
                    text: item.Owner_Type__c == 'Individual' ? item.Passport_Number__c : item.Registration_Number__c, //((item.Owner_Type__c == 'Corporate' && item.DACC_Registered__c == 'Yes') ? item.Corporate_Account__r.Registration_Number_Value__c : item.Owner_Type__c == 'Individual' ? item.Passport_Number__c : item.Registration_Number__c),
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 15%;',
                  },
                  {
                    text: item.Status__c,
                    isDate: false,
                    isNumber: false,
                    isText: true,
                    rowStatusClass: "",
                    stylecss: 'flex: 0 0 10%;',
                  }
                ],
              });
            });
            console.log('shareHolderMembersData::' + JSON.stringify(this.shareHolderMembersData));
          }
          /* if(this.sharedHoldersCorporateData.length > 0){
               this.shareHolderCorporatemembersData = [];
               this.sharedHoldersCorporateData.forEach((item) => {
               this.shareHolderCorporatemembersData.push({
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
                 values: [
                   {
                     text: item.Full_Name__c,
                     isDate: false,
                     rowStatusClass: "",
                   },
                   {
                     text: item.Passport_Number__c,
                     isDate: false,
                     rowStatusClass: "",
                   },
                   {
                     text: this.removeDuplicateRoles(item.Role__c),
                     isDate: false,
                     rowStatusClass: "",
                   },
                   {
                     text: item.Status__c,
                     isDate: false,
                     rowStatusClass: "",
                   }
                 ],
               });
             });
           } */
        }
        // console.log('entityType--->'+this.entityType);
        // console.log('allowedBoardMembers--->'+JSON.stringify(this.maximumAllowed));
        // console.log('formRole--->'+this.formRole);
        // if(this.formRole !='UBO' && this.membersData.length == this.maximumAllowed){
        //    // this.hideAddBtnlabel = true;
        // }  
        this.showSpinner = false;

      })
      .catch(error => {
        this.showSpinner = false;
        console.error('Error calling Apex method:', error);
      });
  }

  /*@wire(getExistingShareHoldersData, { onboardRecordId: '$serviceRequestId', role: '$formRole' })
  wiredData(result) {
    this.wiredResult = result;
    var individualData = [];
    var corporateData = [];
    //var directorsData = [];
    if (result.data) {
      if (this.formName == 'Add Shareholders') {
        this.showDirectorData = false;
        this.shareHoldersAllData = result.data;
        result.data.forEach(function (el, i) {
  
          if (el.Owner_Type__c !== undefined && el.Owner_Type__c == 'Individual') {
            individualData.push(el);
          } else if (el.Owner_Type__c !== undefined && el.Owner_Type__c == 'Corporate') {
            corporateData.push(el);
          }
        })
        this.sharedHoldersCorporateData = corporateData;
        this.sharedHoldersIndividualData = individualData;
        if (this.sharedHoldersIndividualData.length === 0 && this.sharedHoldersCorporateData.length === 0) {
          this.showShareHoldersForm = true;
          this.createOBRecord();
        } else {
          this.showShareHoldersForm = false;
        }
      } else if (this.formName == 'Add Directors') {
        console.log(JSON.stringify(result.data));
        this.directorsData = result.data;
  
        if (result.data.length > 0) {
          this.showShareHoldersForm = false;
          this.showDirectorData = true;
        } else {
          this.showShareHoldersForm = true;
          this.showDirectorData = false;
        }
        //this.showShareHoldersData = false;
        this.sharedHoldersIndividualData = [];
        this.sharedHoldersCorporateData = [];
      }
    } else if (result.error) {
      console.error('Error fetching data: ', result.error);
    }
  }*/


  formattedRoles(role) {
    if (!role) {
      return ''; // Return empty if no roles
    }
    // Split roles and transform as needed
    const roles = role.split(';').map((item) =>
      item.includes('Manager') ? item.replace('Manager', 'General Manager') : item
    );
    // Generate HTML code
    return `
      <ul>
          ${roles.map((role) => `<li>${role}</li>`).join('')}
      </ul>
  `;
  }
  async handleRowAction(event) {
    console.log('handleRowAction section details--->' + this.sectionDetails);
    this.showSpinner = true;
    this.validationErrorMessage = '';
    const action = event.detail.eventStatus;
    const recid = event.detail.recId;
    this.skipDocUpload = false;
    const status = event.detail.recStatus;
    const role = event.detail.role;
    this.currentRole = role;
    this.rolePicklistOptions = [];
    console.log('role::' + role);
    this.contentVersionId = '';
    this.uploadedFileName = '';
    let shareHolderData = [];
    let sAmdObj = {};
    this.uboSectionDetail = [];
    console.log('event.detail::' + JSON.stringify(event.detail));
    console.log('action::' + action);
    if (action === 'edit_details') { //|| action.name == 'select_details' //
      console.log('isUpdateForm::' + this.isUpdateForm);
      console.log('status::' + status);
      if (status == 'Active') {
        this.obrecordId = '';
        console.log('relAccId::' + event.detail.relAccId);
        this.relAccountId = event.detail.relAccId;
        this.relId = event.detail.recId;
        await getSelectedRelationInfo({ relationId: this.accId })
          .then(result => {
            shareHolderData = result;
            shareHolderData.forEach(function (dt) {
              if (dt.Id == recid) {
                console.log('DACC_Registered__c::' + dt.DACC_Registered__c);
                console.log('Corporate_Account__c::' + dt.Corporate_Account__c);
                sAmdObj['DACC_Registered__c'] = dt.DACC_Registered__c;
                sAmdObj['Corporate_Account__c'] = dt.Corporate_Account__c;
                sAmdObj['Place_of_Registration__c'] = dt.Place_of_Registration__c;
              }
            });
            this.selectedMemberList = result;
            console.log('selectedMemberList::' + JSON.stringify(shareHolderData));
          })
          .catch(error => {
            console.error('Error calling Apex method:', error);
          });
      } else if (status == 'New') {
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
            /* shareHolderData.forEach(function (dt) { 
              if(dt.Id == recid){
                 sObjectTemp['DACC_Registered__c'] = dt.DACC_Registered__c;
                 sObjectTemp['Corporate_Account__c'] = dt.Corporate_Account__c;             
              }
             });*/
            //console.log('result 1--->'+JSON.stringify(result));
            this.selectedMemberList = result;
            console.log('selectedMemberList:: 3706' + JSON.stringify(shareHolderData));
          })
          .catch(error => {
            console.error('Error calling Apex method:', error);
          });
      }/*else{
        this.skipDocUpload = true;
        this.obrecordId = recid;
        shareHolderData = this.existingData;
        if(this.isUpdateForm){
        await getSelectedAmendementInfo({ relationId: recid })
        .then(result => {
          if(shareHolderData.length == 0){
            shareHolderData = result;
          }
          console.log('result 3--->'+JSON.stringify(result));
				   this.selectedMemberList = result;
           console.log('selectedMemberList::'+ JSON.stringify(shareHolderData));
				  })
          .catch(error => {
              console.error('Error calling Apex method:', error);
           });
        }
    }*/
      if (this.selectedMemberList && this.selectedMemberList.length > 0) {
        this.shareholderType = this.selectedMemberList[0].Owner_Type__c;
        this.shareHolderSelectedValue = this.selectedMemberList[0].Owner_Type__c;
        // this.sObjects['No_of_Shares__c'] = this.selectedMemberList[0].No_of_Shares__c;
        // this.sObjects['Owner_Type__c'] = this.selectedMemberList[0].Owner_Type__c;
        // this.sObjects['Shareholder_Type__c'] = this.selectedMemberList[0].Owner_Type__c;
        sAmdObj['DACC_Registered__c'] = this.selectedMemberList[0].DACC_Registered__c;
        sAmdObj['Corporate_Account__c'] = this.selectedMemberList[0].Corporate_Account__c;
        sAmdObj['Place_of_Registration__c'] = this.selectedMemberList[0].Place_of_Registration__c;
        sAmdObj['Is_UBO__c'] = this.selectedMemberList[0].Is_UBO__c;
        sAmdObj['UBO_JSON__c'] = this.selectedMemberList[0].UBO_JSON__c;
        this.sObjects['UBO_JSON__c'] = this.selectedMemberList[0].UBO_JSON__c;
        sAmdObj['External_Id__c'] = this.selectedMemberList[0].External_Id__c;
        this.nodeUniqueID = this.selectedMemberList[0].External_Id__c;
        if (sAmdObj['DACC_Registered__c'] != 'Yes')
          this.contentVersionId = this.selectedMemberList[0].Content_Version_Id__c != '' ? this.selectedMemberList[0].Content_Version_Id__c : '';
        // this.sectionDetails = this.sectionDetails.filter(item => (item.section.acbox__Type__c == this.shareholderType));
        this.sectionDetails.forEach(item => {
          /*if(!item.section.acbox__Type__c || item.section.acbox__Type__c == 'ShareholderType' || item.section.acbox__Type__c == this.shareholderType){
            if(isDACCAccount == 'Yes'){
                this.hideDACCDropdown = true;
                this.isNotDACCRegistered = false;
                this.isDACCRegistered = true;
                if(item.section.Name != 'New Corporate Details')            
                item.section.isRenderByDefault = true;
            }else if(isDACCAccount == 'No'){
                this.hideDACCDropdown = false;
                this.isNotDACCRegistered = true;
                this.isDACCRegistered = false;
                item.section.isRenderByDefault = true;
            }else{
              this.hideDACCDropdown = false;
              this.isNotDACCRegistered = true;
              this.isDACCRegistered = false;
              item.section.isRenderByDefault = true;
            }
          } */
          if (this.formName == 'Add Shareholders') {
            // console.log('DACC_Registered__c1::'+this.sObjects['DACC_Registered__c']);
            // console.log('Corporate_Account__c1::'+this.sObjects['Corporate_Account__c']);
            if (item.section.acbox__Type__c == 'ShareholderType') {
              var fields = item.sectionDetails;
              for (var j = 0; j < fields.length; j++) {
                if (fields[j].acbox__Field_API_Name__c == 'Shareholder_Type__c' || fields[j].acbox__Field_API_Name__c == 'DACC_Registered__c' || fields[j].acbox__Field_API_Name__c == 'Place_of_Registration__c' || fields[j].acbox__Field_API_Name__c == 'Corporate_Account__c') {
                  fields[j].acbox__Component_Type__c = 'Output Field';
                  fields[j].acbox__Is_Disable__c = true;
                }
              }
            }
            if (sAmdObj['DACC_Registered__c'] == 'Yes') {

              if ((item.section.acbox__Type__c == 'ShareholderType' || item.section.Name == 'Roles - Corporate' || item.section.Name == 'Power of Attorney Details' || item.section.Name == 'Additional Ultimate Beneficiary Owners' || item.section.Name == 'Corporate UBO Individual') && item.section.Name != 'New Corporate Details' && item.section.Name != 'Address') {
                item.section.isRenderByDefault = true;
                if (sAmdObj['Is_UBO__c'] == true) {
                  this.accountLookupId = sAmdObj["Corporate_Account__c"];
                  this.setUboRelationshipJSON(sAmdObj['UBO_JSON__c']);
                  /* if (item.section.acbox__Type__c && item.section.acbox__Type__c.includes('UBO_TREE_MAP')) {
                    item.section.isRenderByDefault = false;

                    let UBOfields = item.sectionDetails;
                    for (var j = 0; j < UBOfields.length; j++) {
                      UBOfields[j].acbox__Default_Value__c = '';
                    }
                    this.uboSectionDetail.push(item);
                  } */
                  this.isUBOTreeVisible = true;
                  /*  if (item.section.Name == 'Additional Ultimate Beneficiary Owners' || item.section.Name == 'Corporate UBO Individual')
                     item.section.isRenderByDefault = true; */
                } else {
                  if (item.section.Name == 'Additional Ultimate Beneficiary Owners' || item.section.Name == 'Corporate UBO Individual') {
                    item.section.isRenderByDefault = false;
                    var fields = item.sectionDetails;
                    for (var j = 0; j < fields.length; j++) {
                      if (fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Name__c'
                        || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Issue_Date__c'
                        || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Email__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Mobile_Number__c' || fields[j].acbox__Field_API_Name__c == 'Number_of_UBO__c') {
                        fields[j].isRenderByDefault = false;
                        fields[j].acbox__Default_Value__c = '';
                        this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
                      }
                    }
                  } else {
                    item.section.isRenderByDefault = true;
                  }
                }
              } else {
                item.section.isRenderByDefault = false;
              }
            } else {
              if (!item.section.acbox__Type__c || item.section.acbox__Type__c == 'ShareholderType' || (item.section.acbox__Type__c == this.shareholderType) || item.section.acbox__Type__c.includes('UBO_TREE_MAP')) {
                item.section.isRenderByDefault = true;
                if (sAmdObj['Is_UBO__c'] == true && this.shareholderType == 'Corporate') {
                  //added by manoj for ubo tree
                  this.countryLookupId = sAmdObj["Place_of_Registration__c"];

                  this.setUboRelationshipJSON(sAmdObj['UBO_JSON__c']);
                  /*  if (item.section.acbox__Type__c && item.section.acbox__Type__c.includes('UBO_TREE_MAP')) {
                     item.section.isRenderByDefault = false;
 
                     let UBOfields = item.sectionDetails;
                     for (var j = 0; j < UBOfields.length; j++) {
                       UBOfields[j].acbox__Default_Value__c = '';
                     }
                     this.uboSectionDetail.push(item);
                   } */
                  this.isUBOTreeVisible = true;
                  //commented by manoj to show ubp tree             
                  /*  if(item.section.Name == 'UBO Details' || item.section.Name == 'Additional Ultimate Beneficiary Owners' || item.section.Name == 'Corporate UBO Individual')
                     item.section.isRenderByDefault = true;        */
                } else {
                  this.isUBOTreeVisible = false;

                  if (item.section.Name == 'UBO Details' || item.section.Name == 'Additional Ultimate Beneficiary Owners' || item.section.Name == 'Corporate UBO Individual' || item.section.acbox__Type__c.includes('UBO_TREE_MAP')) {
                    item.section.isRenderByDefault = false;
                    var fields = item.sectionDetails;
                    for (var j = 0; j < fields.length; j++) {
                      if (fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Name__c'
                        || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Number__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Issue_Date__c'
                        || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Passport_Expiry_Date__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Email__c' || fields[j].acbox__Field_API_Name__c == 'UBO_Individual_Mobile_Number__c' || fields[j].acbox__Field_API_Name__c == 'Number_of_UBO__c') {
                        fields[j].isRenderByDefault = false;
                        fields[j].acbox__Default_Value__c = '';
                        this.sObjects[fields[j].acbox__Field_API_Name__c] = '';
                      }
                    }
                  } else {
                    item.section.isRenderByDefault = true;
                  }
                }
              }
              else {
                item.section.isRenderByDefault = false;
              }
            }
          }
          else {
            item.section.isRenderByDefault = false;
          }
        })
      }
      //this.sectionDetails = [];
      //this.getFormDetails();
      let s = JSON.stringify(this.sectionDetails);
      let k = JSON.parse(s);
      //console.log('k--->'+JSON.stringify(k));

      var sobj = {};
      Object.keys(this.sObjects).forEach(key => {
        sobj[key] = this.sObjects[key];
      });
      console.log('sobj--->' + JSON.stringify(sobj));
      /* let pickOptions = [];
       this.picklistOptions.forEach(obj =>{
         let pObj = {};
         Object.keys(obj).forEach(key => {
           if(key != 'checked'){
               pObj[key] = obj[key];
           }        
         });
         pickOptions.push(pObj);
       })
       console.log('pickOptions--->'+pickOptions);*/
      var isVisitedUAEBefore = false;
      var isUAEResident = false;
      var isPoliticalExposed = false;
      var isDualNationality = false;
      var isCorporateAccount = false;
      var isDACCRegistered = false;
      var isCorporateNotExist = false;
      var isUBO = false;
      var docURL = '';
      var docName = '';
      let isPEPOther = false;

      k.forEach(function (el) {
        el.sectionDetails.forEach(function (fl) {
          // console.log(fl.acbox__Field_API_Name__c);        
          shareHolderData.forEach(function (dt) {
            //console.log('dt API Name--->'+JSON.stringify(dt));
            //console.log('dt Value--->'+dt[fl.acbox__Field_API_Name__c]);
            if ((status == 'Active' || status == 'New' || dt.Id === recid) && dt[fl.acbox__Field_API_Name__c] !== undefined) {
              if (dt['Document_Link__c'] !== undefined) {
                docURL = dt['Document_Link__c'];
              }
              if (dt['Document_Name__c'] !== undefined) {
                docName = dt['Document_Name__c'];
              }
              fl.acbox__Default_Value__c = dt[fl.acbox__Field_API_Name__c];
              if (status != 'Active') {
                fl['Id'] = recid;
                sobj['Id'] = recid;
              }
              sobj[fl.acbox__Field_API_Name__c] = dt[fl.acbox__Field_API_Name__c];
              //sobj['Role__c'] = dt['Role__c'];
              //sobj['Owner_Type__c'] = dt['Owner_Type__c'];
              //sobj['No_of_shares__c'] =  dt['No_of_Shares__c'];
              //sobj['DACC_Registered__c'] = dt['DACC_Registered__c'];
              //sobj['Corporate_Account__c'] = dt['Corporate_Account__c'];   
              //sobj['Shareholder_Type__c'] = dt['Owner_Type__c']; 
              //sobj['Is_UBO__c'] = dt['Is_UBO__c'];  

              /*pickOptions.forEach(opt =>{
                if(opt['label'] == dt['Owner_Type__c']){
                  opt['checked'] = 'checked';
                }
              })*/
              if (fl.acbox__Field_API_Name__c == 'Have_you_visited_the_UAE_before__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes') {
                isVisitedUAEBefore = true;
              } else if (fl.acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes') {
                isUAEResident = true;
              } else if (fl.acbox__Field_API_Name__c == 'Are_you_a_Politically_Exposed_Person__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes') {
                isPoliticalExposed = true;
              } else if (fl.acbox__Field_API_Name__c == 'Do_you_have_dual_Nationality__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes') {
                isDualNationality = true;
              } else if (fl.acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c' && dt[fl.acbox__Field_API_Name__c] == 'Other') {
                isPEPOther = true;
              } else if (fl.acbox__Field_API_Name__c == 'DACC_Registered__c' && dt[fl.acbox__Field_API_Name__c] == 'Yes') {
                isCorporateAccount = true;
              } else if (fl.acbox__Field_API_Name__c == 'Shareholder_Type__c' && dt[fl.acbox__Field_API_Name__c] == 'Corporate') {
                isDACCRegistered = true;
              } else if (fl.acbox__Field_API_Name__c == 'DACC_Registered__c' && dt[fl.acbox__Field_API_Name__c] == 'No') {
                isCorporateNotExist = true;
              } else if (fl.acbox__Field_API_Name__c == 'Is_UBO__c' && dt[fl.acbox__Field_API_Name__c] == true && dt['Shareholder_Type__c'] == 'Corporate') {
                isUBO = true;
              }
            }
          })
        })

      })
      //this.NoOfShares =  sobj['No_of_shares__c'];
      // this.DACCAccount = sobj['DACC_Registered__c'];
      k.forEach(function (el) {
        el.sectionDetails.forEach(function (fl) {
          //console.log('fl--->'+fl.acbox__Field_API_Name__c);
          //console.log('isUBO--->'+isUBO);
          if (isVisitedUAEBefore == true && (fl.acbox__Field_API_Name__c == 'Are_you_resident_in_the_UAE__c')) {
            fl.isRenderByDefault = true;
          } else if (isUAEResident == true && fl.acbox__Field_API_Name__c == 'Emirates_ID__c') {
            fl.isRenderByDefault = true;
          } else if (isPoliticalExposed == true && fl.acbox__Field_API_Name__c == 'Type_of_Politically_Exposed_Person__c') {
            fl.isRenderByDefault = true;
          } else if (isDualNationality == true && (fl.acbox__Field_API_Name__c == 'Secondary_Passport_Expiry_Date__c'
            || fl.acbox__Field_API_Name__c == 'Secondary_Passport_Issue_Date__c' || fl.acbox__Field_API_Name__c == 'Secondary_Passport_Issuing_country__c'
            || fl.acbox__Field_API_Name__c == 'Secondary_Passport_Number__c' || fl.acbox__Field_API_Name__c == 'Secondary_Place_Of_Issue__c')) {
            fl.isRenderByDefault = true;
          } else if (isPEPOther && fl.acbox__Field_API_Name__c == 'PEP_Other__c') {
            fl.isRenderByDefault = true;
          } else if (isCorporateAccount == true && fl.acbox__Field_API_Name__c == 'Corporate_Account__c') {
            fl.isRenderByDefault = true;
          } else if (isDACCRegistered == true && fl.acbox__Field_API_Name__c == 'DACC_Registered__c') {
            fl.isRenderByDefault = true;
          } else if (isCorporateNotExist == true && fl.acbox__Field_API_Name__c == 'Place_of_Registration__c') {
            fl.isRenderByDefault = true;
          } else if (fl.acbox__Field_API_Name__c == 'Status_of_BO_Ownership__c') {
            if (isUBO) {
              fl.isRenderByDefault = true;
            } else {
              fl.isRenderByDefault = false;
            }
          }
        })
      });
      this.documentURL = docURL;
      this.documentName = docName;
      if (this.isNotDACCRegistered == true)
        this.uploadedFileName = docName;
      //this.picklistOptions = pickOptions;
      this.sectionDetails = k;

      Object.keys(sobj).forEach(key => {
        this.sObjects[key] = sobj[key];
      });
      this.showShareHoldersForm = true;
      //this.showDirectorData = false;
      this.showPersonalInfo = true;
      this.showShareholdeTypeSection = false;
      //this.showSpinner = false;
      this.closeModal();
      this.closeModalExisting();
      if (action.name === 'select_details') {
        this.obrecordId = '';
        this.closeModal();
        this.closeModalExisting();

      }


    }
    else if (action == 'delete_details') {
      let rolePickOptions = [];
      let roles = role.split(";");
      console.log('roles.length--->' + roles.length);
      this.relId = event.detail.recId;
      if (roles.length > 1) {
        roles.forEach(function (role) {
          if (role != 'Shareholder') {
            let roleLabel = role == 'Manager' ? 'General Manager' : role;
            rolePickOptions.push({ label: 'Remove ' + roleLabel + '?', value: role, checked: false });
          }
        });
        this.rolePicklistOptions = rolePickOptions;
        console.log('ths.rolePicklistOptions--->' + this.rolePicklistOptions);
        this.isDeleteModalOpen = true;
        this.confirmationMessage = "Are you sure? This action will remove the role from applicant's record.";
      } else {
        //if(status=='New' || status=='Existing' || status=='Remove'){
        this.confirmationMessage =
          "Are you sure? This action will delete the applicant's record.";
        this.isDialogVisible = true;
        this.delRecordId = recid;
        //}
        // else if(status=='Active'){
        //    this.confirmationMessage =
        //   "Are you sure? This action will remove the applicant's record.";
        //   this.isDialogVisibleGen = true;
        //   console.log("Delete Request By Sai in Company for Director");
        //   this.delRecordId =recid;
        // }

      }
      // else if(action == 'select_details'){
      //   console.log('event checked:'+event.detail.checked);
      //    var isMemSelected = event.detail.checked;
      //    if(isMemSelected && this.selectedMembers.indexOf(event.detail.recId)==-1)
      //     this.selectedMembers.push(event.detail.recId);
      //    else if(!isMemSelected && this.selectedMembers.indexOf(event.detail.recId)!=-1){
      //      this.selectedMembers = this.selectedMembers.filter(elem => elem !== event.detail.recId);
      //    }     

    }

    if (this.countryLookupId) await refreshApex(this.countryObjRec);

    if (this.accountLookupId) await refreshApex(this.AccountObjRec);

  }
  /*
  createAmendmentExistingRelation() {
    console.log('createAmendmentExistingRelation::'+this.selectedMembers);
     createAmendmentforExistingRelation({ reqId: this.serviceRequestId, recIds: this.selectedMembers, role : this.formRole,status:'Existing'})
        .then(result => {
           if(result){
             if(this.formTemplatUniqueCode == 'AddorRemoveDirector' || this.formTemplatUniqueCode == 'AddorRemoveSecretary' || this.formTemplatUniqueCode == 'AddorRemoveManager' || this.formTemplatUniqueCode == 'AddorRemovePOA' || this.formTemplatUniqueCode == 'UpdateDirector' || this.formTemplatUniqueCode == 'UpdateManager' || this.formTemplatUniqueCode == 'UpdateSecretary' || this.formTemplatUniqueCode == 'UpdateShareholder' ){
               let newData = result.amendmentList;
               if (this.directorsData && this.directorsData.length > 0) {
                 newData.forEach(item => {
                 if (!this.directorsData.some(existingItem => existingItem.Id === item.Id)) {
                   this.directorsData.push(item);
                 }
               });
               } else {
               this.directorsData = newData;
               }
  
             }
             this.connectedCallback();
  
           }
         })
         .catch(error => {
          console.error('Error calling Apex method:', error);
         });
  } */
  /*
  addAdditionalShareHolder() {
    console.log('this.shareHolderSelectedValue--->'+this.shareHolderSelectedValue);
    console.log('this.shareholderType--->'+this.shareholderType);
    console.log('this.sObjects before--->'+JSON.stringify(this.sObjects));
    this.shareHolderSelectedValue = 'Individual';
    this.shareholderType = 'Individual';
    this.sObjects['Owner_Type__c'] = 'Individual';
    this.sObjects['DACC_Registered__c'] = '';
    this.sObjects['Corporate_Account__c'] = '';
    this.sObjects['No_of_shares__c'] = '';
    this.sObjects['Id'] = '';
    console.log('this.sObjects after--->'+JSON.stringify(this.sObjects));
    this.documentText =  'Upload a Passport Copy';
    //this.showDirectorData = false;
    this.showPersonalInfo=false;
    this.hideDACCDropdown = false;
    this.isNotDACCRegistered = true;
    this.isDACCRegistered = false;
    this.obrecordId = '';
    this.uploadedFileName = '';
    this.NoOfShares = '';
    this.DACCAccount = '';
    this.showShareHoldersForm = true;
    delete this.sObjects['Id'];
    //this.createOBRecord();
  }
  */
  async addAdditionalShareHolder() {
    this.nodeUniqueID = await getGUID(); //added by manoj    
    this.sObjects['UBO_JSON__c'] = '';
    this.sObjects['External_Id__c'] = this.nodeUniqueID; 
    this.showShareHoldersForm = true;
    this.showPersonalInfo = true;
    //this.showDirectorData = false;
    this.obrecordId = '';
    this.uploadedFileName = '';
    this.shareholderType = '';
    this.contentVersionId = '';
    delete this.sObjects['Id'];
    //this.createOBRecord();
  }

  handleShareHolderChange(event) {
    this.isShareholderSel = true;
    this.shareHolderSelectedValue = event.target.value;
    this.shareholderType = event.target.value;
    this.uploadedFileName = '';
    this.sObjects['Owner_Type__c'] = this.shareHolderSelectedValue;
    this.helpText = `Please upload a clear, coloured scan of Applicant’s passport pages displaying personal details. Please ensure that your passport is valid for atleast 
                            six months from the date of submission. The maximum file size allowed is 2mb and accepted file formats are ".pdf,.jpeg,.jpg".`;
    if (this.shareHolderSelectedValue == 'Corporate') {
      this.documentText = 'Upload a License Copy';
      this.helpText = 'Please upload company Trade License copy.';
    } else {
      this.documentText = 'Upload a Passport Copy';
    }
    console.log('sobject---->' + JSON.stringify(this.sObjects));
    this.showPersonalInfo = false;
    if (this.formTemplatetitle == 'Add Shareholders') {
      this.isShareHolderPage = true;
      if (this.shareHolderSelectedValue == 'Individual') {
        this.isDACCRegistered = false;
        this.hideDACCDropdown = false;
        this.isNotDACCRegistered = true;
      } else if (this.shareHolderSelectedValue == 'Corporate') {
        this.isDACCRegistered = false;
        this.hideDACCDropdown = true;
        this.isNotDACCRegistered = false;
      }
    }
    for (var i = 0; i < this.sectionDetails.length; i++) {
      if (!this.sectionDetails[i].section.acbox__Type__c || (this.sectionDetails[i].section.acbox__Type__c == this.shareholderType || this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue)) {
        this.sectionDetails[i].section.isRenderByDefault = true;
      } else {
        this.sectionDetails[i].section.isRenderByDefault = false;
      }
    }
    if (this.shareHolderSelectedValue != 'Individual') {
      // this.showChoosefromPeople = false;
      this.showChoosefromExisting = false;
    } else {
      this.showChoosefromExisting = this.isAmendmentCreated == true ? false : this.relatedRecordsAll.length > 0 ? true : false;
      //this.showChoosefromPeople = this.relatedRecords.length > 0 ? true : false;
    }
  }

  handleRoleChange(event) {
    let sObjects = { sobjectType: this.reqObjectName };
    sObjects.Id = this.relId;
    sObjects.Role__c = this.currentRole;
    console.log('roleSelectedValue::' + event.detail.fieldapi + ':' + event.detail.value);
    console.log('this.currentRole::' + this.currentRole);
    console.log('recordId::' + this.relId);
    this.hasRoleError = false;
    this.roleValidationMessage = '';
    this.rolePicklistOptions.forEach(function (role) {
      if (role.value == event.detail.fieldapi)
        role.checked = event.detail.value;
    });
    let roleValue = '';
    let dirId = this.drRelId;
    let scId = this.scRelId;
    let mgrId = this.mgrRelId;
    let delRecId = '';
    let crRole = this.currentRole;
    let modefiedRole = '';
    this.rolePicklistOptions.forEach(function (role) {
      if (role.checked == true) {
        roleValue = roleValue + role.value + ';';
        if (role.value == 'Director') {
          let roleVal = role.value + ';';
          if (!crRole.includes(roleVal)) { roleValue = roleVal.slice(0, -1); }
          crRole = crRole.replace(roleValue, "");
          sObjects.Is_Director__c = false;
        }
        if (role.value == 'Secretary') {
          let roleVal = role.value + ';';
          if (!crRole.includes(roleVal)) { roleValue = roleVal.slice(0, -1); }
          crRole = crRole.replace(roleValue, "");
          sObjects.Is_Secretary__c = false;

        }
        if (role.value == 'Manager') {
          let roleVal = role.value + ';';
          if (!crRole.includes(roleVal)) { roleValue = roleVal.slice(0, -1); }
          crRole = crRole.replace(roleValue, "");
          sObjects.Is_Manager__c = false;
        }
        if (role.value == 'UBO') {
          let roleVal = role.value + ';';
          if (!crRole.includes(roleVal)) { roleValue = roleVal.slice(0, -1); }
          crRole = crRole.replace(roleValue, "");
          sObjects.Is_UBO__c = false;
        }
        console.log('Rolval--->' + roleValue);
      }
      else {
        roleValue = roleValue.replace(role.value + ';', "");
        // if(role.value == 'Director' && dirId && delRecId.includes(dirId))
        //   delRecId = delRecId.replace(dirId+';', "");
        // if(role.value == 'Secretary' && scId && delRecId.includes(scId))
        //   delRecId = delRecId.replace(scId+';', "");
        // if(role.value == 'Manager' && mgrId && !delRecId.includes(mgrId))
        //   delRecId = delRecId.replace(mgrId+';', "");   
      }
    });
    console.log('roleValue::' + roleValue);
    console.log('crRole::' + crRole);
    this.roleSelectedValue = roleValue;
    //roleValue = roleValue.slice(0, -1);  
    // this.delRecordId = delRecId.slice(0, -1);      

    // this.roleSelectedValue = roleValue;
    crRole = crRole.replace(roleValue, '');
    let role = crRole.replace(/;$/, '');
    sObjects['Role__c'] = role;
    console.log('role after remove--->' + sObjects['Role__c']);
    this.objAmendment = sObjects;
    console.log('Sobject--->' + JSON.stringify(sObjects));
    console.log('this.objAmendment--->' + JSON.stringify(this.objAmendment));
  }

  /* createOBRecord() {
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
  } */

  populateDataFromOCR(response) {
    this.showShareholdeTypeSection = false;
    this.showPersonalInfo = true;
    console.log('response--->' + JSON.stringify(response));
    this.sectionDetails.forEach(item => {
      if ((!item.section.acbox__Type__c || item.section.acbox__Type__c == 'ShareholderType' || item.section.acbox__Type__c == this.shareholderType) && item.section.Name != 'UBO Details' && item.section.Name != 'Additional Ultimate Beneficiary Owners' && item.section.Name != 'Corporate UBO Individual') {
        item.section.isRenderByDefault = true;
      } else {
        item.section.isRenderByDefault = false;
      }
    })
    let s = JSON.stringify(this.sectionDetails);
    let k = JSON.parse(s);
    console.log('k---->' + JSON.stringify(k));
    let sobj = {};
    for (const [key, value] of Object.entries(this.sObjects)) {
      sobj[key] = value;
    }
    if (response.FirstName && response.FirstName !== '') {
      this.documentName = response.FirstName + response.LastName;
    }
    if (response.docUrl != null) {
      this.documentURL = response.docUrl;
    }
    const timezoneOffset = 4 * 60 * 60 * 1000; // 4 hours in milliseconds
    k.forEach(function (el) {
      console.log('el--->' + JSON.stringify(el.sectionDetails));
      el.sectionDetails.forEach(function (fl) {
        console.log('fl--->' + fl.acbox__Field_API_Name__c);
        if (fl.acbox__Field_API_Name__c == 'First_Name__c' && response.FirstName) {
          fl.acbox__Default_Value__c = response.FirstName;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Last_Name__c' && response.LastName) {
          fl.acbox__Default_Value__c = response.LastName;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Full_Name__c') {
          fl.acbox__Default_Value__c = response.FirstName + ' ' + response.LastName;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Passport_Expiry_Date__c' && response.ExpiryDate) {
          const dateObject = new Date(response.ExpiryDate);
          const localDate = new Date(dateObject.getTime() + timezoneOffset);
          fl.acbox__Default_Value__c = localDate.toISOString().split('T')[0];
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Passport_Number__c' && response.IdentityDocumentNumber) {
          fl.acbox__Default_Value__c = response.IdentityDocumentNumber;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Place_Of_Issue__c' && response.IssuePlace) {
          fl.acbox__Default_Value__c = response.IssuePlace;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Date_Of_Birth__c' && response.DateofBirth) {
          const dateObject = new Date(response.DateofBirth);
          const localDate = new Date(dateObject.getTime() + timezoneOffset);
          fl.acbox__Default_Value__c = localDate.toISOString().split('T')[0];
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Passport_Issued_Date__c' && response.DateOfIssue) {
          const dateObject = new Date(response.DateOfIssue);
          const localDate = new Date(dateObject.getTime() + timezoneOffset);
          fl.acbox__Default_Value__c = localDate.toISOString().split('T')[0];
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Gender__c' && response.Gender) {
          fl.acbox__Default_Value__c = response.Gender;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
        } else if (fl.acbox__Field_API_Name__c == 'Customer_Nationality__c' && response.Nationality) {
          fl.acbox__Default_Value__c = response.Nationality;
          sobj[fl.acbox__Field_API_Name__c] = fl.acbox__Default_Value__c;
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
    // if(this.menutext == 'Company Registration' && this.relatedRecords.length > 0){
    //     this.isAmendmentModalOpen = true;
    //   }else{
    //   this.isModalOpen = true;
    //  }
    this.isPersonAccountModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.isAmendmentModalOpen = false;
    this.showSpinner = false;
    this.isDeleteModalOpen = false;
    this.hasRoleError = true;
    this.roleValidationMessage = '';
  }

  closeModalExisting() {
    this.isModalOpen = false;
    this.isPersonAccountModalOpen = false;
    this.showSpinner = false;
    this.isDeleteModalOpen = false;
    this.hasRoleError = true;
    this.roleValidationMessage = '';
  }

  deleteMemberRole() {
    console.log('this.objAmendment--->' + JSON.stringify(this.objAmendment));
    console.log('this.roleSelectedValue--->' + this.roleSelectedValue);
    if (this.roleSelectedValue == null || this.roleSelectedValue == '') {
      this.hasRoleError = true;
      this.roleValidationMessage = 'Please select at least one role to remove.';
    } else {
      this.showSpinner = true;
      this.hasRoleError = false;
      this.roleValidationMessage = '';
      setTimeout("", 500);
      this.isDeleteModalOpen = false;
      console.log('this.objAmendment--->' + this.objAmendment);
      console.log('this.roleSelectedValue-->' + this.roleSelectedValue);
      updatesObjectRecord({ record: this.objAmendment })
        .then(result => {
          if (result) {
            this.connectedCallback();
          }
        })
        .catch(error => {
          console.error('Error calling Apex method:', error);
        });
    }
  }

  deleteFile() {
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

  /* async getConfirmationGen(event) {
 this.showSpinner = true;
     setTimeout("", 500);
     let sObjects = { sobjectType: this.reqObjectName };
     sObjects.Id = this.serviceRequestId;
     if (event.detail !== 1) {
       if (event.detail.status === "confirm") {
         this.isDialogVisibleGen = false;
         console.log('delete Member::'+this.delRecordId+':Role:'+this.formRole);
        createAmendmentforDiretor({ reqId: this.serviceRequestId, recId: this.delRecordId, role:this.formRole })
       .then(result => {
         if(result){
           if(this.formTemplatUniqueCode == 'AddorRemoveDirector' || this.formTemplatUniqueCode == 'AddorRemoveSecretary' || this.formTemplatUniqueCode == 'AddorRemoveManager' || this.formTemplatUniqueCode == 'AddorRemovePOA'){
             let newData = result.amendmentList;
             if (this.directorsData && this.directorsData.length > 0) {
               newData.forEach(item => {
               if (!this.directorsData.some(existingItem => existingItem.Id === item.Id)) {
                 this.directorsData.push(item);
               }
             });
             } else {
             this.directorsData = newData;
             }
 
           }
           this.connectedCallback();
 
         }
       })
       .catch(error => {
         console.error('Error calling Apex method:', error);
       });
         
       } else if (event.detail.status === "cancel") {
         this.isDialogVisibleGen = false;
         this.showSpinner = false;
         this.delRecordId="";
         console.log('After cancel1=='+this.delRecordId);
       }
     } else {
       this.isDialogVisibleGen = false;
       this.showSpinner = false;
       this.delRecordId="";
       console.log('After Cancel2=='+this.delRecordId);
     }
   } */
  async getConfirmation(event) {

    this.showSpinner = true;
    setTimeout("", 500);
    let sObjects = { sobjectType: this.reqObjectName };
    sObjects.Id = this.serviceRequestId;
    if (event.detail !== 1) {
      if (event.detail.status === "confirm") {
        this.isDialogVisible = false;
        // let result = await deleteServiceRequest({ sObj: sObjects });
        // if (result.isSuccess) {
        //   this.showSpinner = false;
        //   this.showToast("success", "Request deleted succefully.");
        //   setTimeout(window.open("/DSPortal/", "_self"), 1000);
        // } else {
        //   this.showSpinner = false;
        //   this.showToast(
        //     "error",
        //     "There is an error deleting the record. Please contact customer support."
        //   );
        // }
        deleteRelatedDocuments({ reqId: this.serviceRequestId, recId: this.delRecordId })
          .then(result => {
          })
          .catch(error => {
            console.error('Error calling Apex method:', error);
          });
        deleteRecord(this.delRecordId).then(() => {
          this.delRecordId = "";
          console.log('After Delete==' + this.delRecordId);
          this.connectedCallback();
        })
          .catch((error) => {
            console.log(error);
          });

      } else if (event.detail.status === "cancel") {
        this.isDialogVisible = false;
        this.showSpinner = false;
        this.delRecordId = "";
        console.log('After cancel1==' + this.delRecordId);
      }
    } else {
      this.isDialogVisible = false;
      this.showSpinner = false;
      this.delRecordId = "";
      console.log('After Cancel2==' + this.delRecordId);
    }
  }

  validateStatusOfBOOwnership(statofBOPercentage) {
    this.uboPercentage = statofBOPercentage;
    console.log('statofBOPercentage--->' + statofBOPercentage);
    if (statofBOPercentage) {
      if (statofBOPercentage > 100) {
        return false;
      }
      return true;
    }
  }

  //Validate emirates number
  validateEmiratesId(emiratesID) {
    if (emiratesID) {
      if (emiratesID.length < 18 || emiratesID.length > 18) {
        return false;
      }
      return true;
    }
  }
  //Validate passport number
  validatePassportNumber(passportNumber) {
    if (passportNumber) {
      const pattern = /^[a-zA-Z0-9\s]*$/;
      const resp = pattern.test(passportNumber);
      return resp;
    }
  }

  //Validate Place of Birth
  validatePlaceOfBirth(value) {
    if (value) {
      const pattern = /^[a-zA-Z0-9\s]*$/;
      const resp = pattern.test(value);
      return resp;
    }
  }

  //Validate mobile number
  validateMobileNumber(mobile) {
    if (mobile) {
      const phoneRegex = /^\+\d{3}\d{9}$/;
      const resp = phoneRegex.test(mobile);
      console.log('resp--->' + resp);
      return resp;
    }
  }

  /* This method checks if the age is below 18 yrs. */
  handleDOBvalidation(birthdate) {
    if (birthdate) {
      birthdate = new Date(birthdate);
      const today = new Date();
      let age = today.getFullYear() - birthdate.getFullYear();
      const monthDiff = today.getMonth() - birthdate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthdate.getDate())) {
        age--;
      }
      if (age < 18) {
        return false;
      }
    }
    return true;
  }

  /* This method DOB should not be today and future date. */
  handleDOBvalidationforShareholders(birthdate) {
    if (birthdate) {
      birthdate = new Date(birthdate);
      const todaysDate = new Date();
      if ((birthdate > todaysDate) || this.isToday(birthdate)) {
        return false;
      }
    }
    return true
  }

  //Check if PI date should not be today or future.
  validatePassportIssueDate(issueDate) {
    if (issueDate) {
      issueDate = new Date(issueDate);
      const todaysDate = new Date();
      if (issueDate > todaysDate) { // || this.isToday(issueDate)){
        return false;
      }
    }
    return true
  }

  validateDatehistoric(dateInput) {
    dateInput = new Date(dateInput);
    if (dateInput.getFullYear() < 1700) {
      return false;
    }
    return true;
  }

  //Checks is selected date is today..
  isToday(date) {
    const now = new Date();
    return date.getDate() === now.getDate() &&
      date.getMonth() === now.getMonth() &&
      date.getFullYear() === now.getFullYear();
  }

  //Check if PP is going to expire within 6 months.
  validatePassportExpiry(expiryDate) {
    const today = new Date().getTime();
    const expiry = new Date(expiryDate).getTime();
    // Calculate the minimum valid expiry date (6 months from today)
    const minValidExpiry = today + (1000 * 60 * 60 * 24 * 180); // 180 days (6 months)
    // Check if expiry date is less than minimum valid date
    if (expiry < minValidExpiry) {
      return false; // Passport expiry is invalid (less than 6 months)
    }
    return true;
  }

  handleOnChange(event) {
    this.showSpinner = true;
    if (event.target.name == 'No_of_shares__c') {
      this.NoOfShares = event.target.value;
      this.sObjects['No_of_shares__c'] = event.target.value;
    }
    if (event.target.name == 'DACC_Registered__c') {
      this.DACCAccount = event.target.value;
      this.sObjects['DACC_Registered__c'] = event.target.value;
      if (event.target.value == 'Yes') {
        this.isDACCRegistered = true;
        for (var i = 0; i < this.sectionDetails.length; i++) {
          if (!this.sectionDetails[i].section.acbox__Type__c || (this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue && this.sectionDetails[i].section.Name != 'New Corporate Details'))
            this.sectionDetails[i].section.isRenderByDefault = true;
          else
            this.sectionDetails[i].section.isRenderByDefault = false;
        }
        this.showPersonalInfo = true;
        this.showShareholdeTypeSection = false;
        this.isNotDACCRegistered = false;
        this.skipDocUpload = true;
      } else {
        this.isDACCRegistered = false;
        this.isNotDACCRegistered = true;
        this.skipDocUpload = false;
        for (var i = 0; i < this.sectionDetails.length; i++) {
          if (!this.sectionDetails[i].section.acbox__Type__c || this.sectionDetails[i].section.acbox__Type__c == this.shareHolderSelectedValue)
            this.sectionDetails[i].section.isRenderByDefault = true;
          else
            this.sectionDetails[i].section.isRenderByDefault = false;
        }
        this.showPersonalInfo = true;
        this.showShareholdeTypeSection = false;
      }
    }
    this.showSpinner = false;
  }

  /* Added by manoj to capture ubo tree changes */
  // NEW (parent JS): handler wired to <c-ds_-portal-u-b-o-tree-diagram onubosave={handleUboSave}>
  handleUboSave(event) {
    const { relationships, uboRecordList, deletedIds, uboSectionDetail } = event.detail || {};
    this.uboRelationship = Array.isArray(relationships) ? relationships : [];
    this.deletedUBOIds = Array.isArray(deletedIds) ? deletedIds : [];
    this.UBOAmendment = Array.isArray(uboRecordList) ? uboRecordList : [];
    this.uboSectionDetail = Array.isArray(uboSectionDetail) ? uboSectionDetail : [];
  }

  handleSave() {
    const treeCmp = this.template.querySelector('c-ds_-portal-u-b-o-tree-diagram');
    treeCmp?.sendDataToParent(); // triggers handleUboSave(...) to refresh uboRelationship/UBOAmendment/deletedUBOIds
    this.handleFormSubmit();
  }

  // NEW (parent JS): given your hierarchical uboRelationship,
  // return { childExternalId -> parentExternalId | null/top-level }
  buildParentMapFromTree(tree = []) {
    const map = new Map();
    const visit = (node, parentExtId) => {
      if (!node || !node.id) return;
      map.set(node.id, parentExtId || null);
      (node.uboList || []).forEach(child => visit(child, node.id));
    };
    (tree || []).forEach(root => visit(root, null));
    return map;
  }

  sanitizeLookupsOnSObject(out) {
    const lookupApis = new Set(this.getLookupFieldApiNamesFromSections(this.uboSectionDetail));
    lookupApis.forEach(api => {
      const v = out[api];
      if (v === undefined) return;
      // strip if not a real SF Id
      if (!(typeof v === 'string' && /^[a-zA-Z0-9]{15,18}$/.test(v))) {
        delete out[api];
      }
    });
    // strip any accidentally carried __label keys at top-level
    Object.keys(out).forEach(k => { if (k.endsWith('__label')) delete out[k]; });
  }


  // Collect lookup API names from a (possibly nested) section schema.
  // A "lookup" is identified by acbox__Field_type__c === 'lookup' (case-insensitive).
  getLookupFieldApiNamesFromSections(sectionDetails) {
    const names = new Set();

    const walk = (node) => {
      if (!node) return;

      // arrays of nodes
      if (Array.isArray(node)) {
        node.forEach(walk);
        return;
      }

      // a section-like node with fields
      if (node.sectionDetails && Array.isArray(node.sectionDetails)) {
        node.sectionDetails.forEach(f => {
          const type = (f?.acbox__Field_type__c || '').toLowerCase();
          if (type === 'lookup') {
            const api = f?.acbox__Field_API_Name__c;
            if (api) names.add(api);
          }
        });
      }

      // recurse into common containers used by your schema
      if (node.sections) walk(node.sections);
      if (node.fields) walk(node.fields);
      if (node.section) walk(node.section); // some schemas nest a 'section' object
    };

    walk(sectionDetails);
    return Array.from(names);
  }

  // NEW (parent JS)
  // drop-in replacement
  prepareUboNodesForCommit(parentId) {
    const parentMap = this.buildParentMapFromTree(this.uboRelationship || []);
    const prepared = [];
    const seen = new Map();
    const typeName = this.objectApiName || (typeof LA_OBJECT !== 'undefined' ? LA_OBJECT.objectApiName : 'OB_Amendment__c');

    (this.UBOAmendment || []).forEach((rec) => {
      if (!rec) return;

      const clientKey = rec.id ?? rec.External_Id__c ?? rec.Id;
      if (!clientKey) return;

      const out = { ...rec };

      // 🔹 ensure correct type metadata so Apex can “read sObject”
      out.sobjectType = typeName;
      out.attributes = { type: typeName };

      out.External_Id__c = clientKey;

      delete out.Name;

      const parentExt = parentMap.get(clientKey);
      if (parentExt === null) {
        out.OB_Amendment__c = parentId;            // top-level parent lookup (matches CFG parentLookupField)
        out.Provisional_Parent_Key__c = null;
      } else {
        out.OB_Amendment__c = null;
        out.Provisional_Parent_Key__c = parentExt ?? null;
      }

      if (out.details && typeof out.details === 'object') {
        try { out.Details__c = JSON.stringify(out.details); } catch (_) { }
        delete out.details;
      }
      if (!out.UBO_Node_Status__c) out.UBO_Node_Status__c = 'Draft';

      const existingIdx = seen.get(out.External_Id__c);
      if (existingIdx !== undefined) {
        prepared[existingIdx] = { ...prepared[existingIdx], ...out };
      } else {
        seen.set(out.External_Id__c, prepared.length);
        this.sanitizeLookupsOnSObject(out);
        prepared.push(out);
      }
    });

    return prepared;
  }



  // NEW (parent JS)
  async commitUboGraphAfterShareholderSave(parentIdOverride) {
    try {
      // Must have a saved shareholder Id from your existing logic
      const parentId = parentIdOverride || this.obrecordId;
      if (!parentId) return; // parent not saved yet, nothing to do
      this.reconcileExternalIdsWithTree();

      const nodesParam = this.prepareUboNodesForCommit(parentId);
      console.log('NODES →', nodesParam);
      const treeJson = JSON.stringify(this.uboRelationship || []);
      const deletedExternalIds = this.deletedUBOIds || [];
      let objectApiName = LA_OBJECT.objectApiName
      // One Apex call that: upserts nodes, wires parents, deletes removed nodes, (optionally) writes snapshot
      await commitUboTree({ parentId, nodesParam, treeJson, deletedExternalIds, objectApiName });

      // clear temp client state if you want
  

    } catch (e) {
      // Do not break the existing save UX; just log/toast
      // this.showToast?.('warning', 'Saved shareholder. UBO commit had an issue; please retry.');
      // eslint-disable-next-line no-console
      console.error('UBO commit error:', e);
    }
  }


reconcileExternalIdsWithTree() {
  const treeIds = new Set();
  const walk = n => {
    if (!n) return;
    if (n.id) treeIds.add(String(n.id));
    (n.uboList || []).forEach(walk);
  };
  (this.uboRelationship || []).forEach(walk);

  (this.UBOAmendment || []).forEach(r => {
    if (!r) return;
    if (!r.External_Id__c && r.id && treeIds.has(String(r.id))) {
      r.External_Id__c = String(r.id);
    }
  });
}

ensureTopLevelAmendmentExternalKey(rootId) {
  if (!rootId) return;
  // Find an existing top-level UBOAmendment row; create one if needed
  let root = (this.UBOAmendment || []).find(r =>
    (r && (r.IsRoot__c || r.isRoot || r.UBO_Node_Level__c === 0)) // whatever flag you use for root
  );

  // Fallback: if you don’t have a root flag, assume the one whose id matches the rootId
  if (!root) {
    root = (this.UBOAmendment || []).find(r => r?.id === rootId || r?.External_Id__c === rootId);
  }

  if (!root) {
    root = { sobjectType: this.objectApiName || 'OB_Amendment__c' };
    this.UBOAmendment.push(root);
  }

  root.id = rootId;
  root.External_Id__c = String(rootId);
}


  // Returns { ok: boolean, offenders: Array<Array<Node>>, message?: string }
  validateUboTreeAllLeavesAreIndividuals(relationships) {
    const rels = Array.isArray(relationships) ? relationships : [];
    const offenders = [];

    const isCorp = (n) => (n?.type || '').toLowerCase() === 'corporate';
    const children = (n) => (Array.isArray(n?.uboList) ? n.uboList : []);
    const isLeaf = (n) => children(n).length === 0;

    const walk = (node, path) => {
      if (!node) return;
      const nextPath = [...path, node];
      if (isLeaf(node) && isCorp(node)) {
        offenders.push(nextPath); // a leaf that is still Corporate → invalid
      }
      children(node).forEach((c) => walk(c, nextPath));
    };

    rels.forEach((root) => walk(root, []));

    if (offenders.length === 0) return { ok: true, offenders: [] };

    // Build a friendly message (list the corporate leaves)
    const label = (n) => {
      const name = n?.companyName || '(unnamed)';
      const t = n?.type || '';
      const c = n?.Country ? `, ${n.Country}` : '';
      return `${name} (${t}${c})`;
      // If you'd rather show the full path, use:
      // return offenders.map(path => path.map(label).join(' → '));
    };
    const leafNames = offenders.map(path => label(path[path.length - 1])).join(', ');
    return {
      ok: false,
      offenders,
      message: `Every UBO branch must end with an Individual. The following node(s) are Corporate leaves: ${leafNames}. Please add Individual UBO(s) under each or remove those Corporate leaves.`
    };
  }


  setUboRelationshipJSON(isOld) {
  if (isOld) {
    const saved = this.sObjects['UBO_JSON__c'];
    this.uboRelationship = saved ? JSON.parse(saved) : (this.uboRelationship || []);
    return;
  }

  const isDaccYes = this.sObjects['DACC_Registered__c'] === 'Yes';
  const companyName = isDaccYes
    ? (this.accountName || '').toUpperCase()
    : (this.sObjects['Company_Name__c'] || '').toUpperCase();

  const country = isDaccYes
    ? (this.accountCountryName || '')
    : (this.accountCountryName || this.countryName || '');

  // stable root id (reuse existing if present, else generate once)
  const rootId = this.nodeUniqueID || 'Parent1';
  this.nodeUniqueID = rootId;

  this.uboRelationship = [{
    id: rootId,
    companyName,
    Country: (country || '').toUpperCase(),
    type: 'Corporate',
    uboList: []
  }];

  // 🔒 ensure the top-level UBOAmendment row carries the same external key
  this.ensureTopLevelAmendmentExternalKey(rootId);
}


  isOldUboSnapshot() {
    const json = this.sObjects && this.sObjects['UBO_JSON__c'];
    return !!(json && String(json).trim());
  }

  showToast(type, message) {
    let icon;
    if (type === 'error') icon = 'utility:error';
    else if (type === 'success') icon = 'utility:success';
    else if (type === 'warning') icon = 'utility:warning';
    else icon = 'utility:info';

    this.template
      .querySelector('c-ds_-portal-toast-lwc')
      .showToast(type, message, icon, 5000);
  }
}