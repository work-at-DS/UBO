public without sharing class ds_lex_PortalUBOTreeDiagramCntrl {


    // =========================
    // Internal per-object config
    // =========================
    private class ObjCfg {
        String objectApiName;
        String externalIdField;
        String parentLookupField;
        String provisionalParentKeyField;
        String statusField;
        String serviceRequestLookupField;
        String shareholderTypePicklistField; // for RT resolution (value provided in input.fields)
        String orderField;
        String depthField;
        String pathField;
        String jsonSnapshotField;
    }

    // Config registry
    private static Map<String, ObjCfg> CFG = new Map<String, ObjCfg>();
    static {
        ObjCfg c = new ObjCfg();
        c.objectApiName                = 'OB_Amendment__c';
        c.externalIdField              = 'External_Id__c';
        c.parentLookupField            = 'OB_Amendment__c';
        c.provisionalParentKeyField    = 'Provisional_Parent_Key__c';
        c.statusField                  = 'UBO_Node_Status__c';
        c.serviceRequestLookupField    = 'Onboard_Request__c';
        c.shareholderTypePicklistField = 'Shareholder_Type__c';
        c.orderField                   = 'UBO_Node_Order__c';
        c.depthField                   = 'UBO_Node_Depth__c';
        c.pathField                    = 'UBO_Node_Path__c';
        c.jsonSnapshotField            = 'UBO_JSON__c';
        CFG.put('OB_Amendment__c', c);

        // To support another object later, create another ObjCfg and put into CFG here.
    }

    //added by manoj to get country name
  @AuraEnabled
     public static String getCountryName(String countryId){
        String countryName;
        List<Country__c> conList= new List<Country__c>();
         if(String.isNotBlank(countryId)){
             conList =[select id,Name FROM Country__c where Id=:countryId LIMIT 1];
             if(conList.size()>0){
                 countryName=conList[0].Name;
             }else{
                 countryName='';
             }
         }
         return countryName;
    }

    private static ObjCfg cfgFor(String objectApiName){
        ObjCfg c = CFG.get(objectApiName);
        if (c == null) {
            throw new AuraHandledException('Unsupported object for UBO ops: ' + objectApiName);
        }
        return c;
    }

    // ---- small, safe describe cache (per tx) ----
    private static Map<String, Schema.DescribeSObjectResult> DESCRIBE_CACHE = new Map<String, Schema.DescribeSObjectResult>();
    private static Schema.DescribeSObjectResult d(String api) {
        Schema.DescribeSObjectResult out = DESCRIBE_CACHE.get(api);
        if (out == null) {
            Schema.SObjectType t = Schema.getGlobalDescribe().get(api);
            if (t == null) throw new AuraHandledException('Unknown object: ' + api);
            out = t.getDescribe();
            DESCRIBE_CACHE.put(api, out);
        }
        return out;
    }
    private static Map<String, Schema.SObjectField> fmap(String api) { return d(api).fields.getMap(); }
    private static Schema.SObjectField fld(String objectApi, String fieldApi) {
        if (String.isBlank(fieldApi)) return null;
        Schema.SObjectField f = fmap(objectApi).get(fieldApi);
        if (f == null) throw new AuraHandledException(objectApi + '.' + fieldApi + ' does not exist.');
        return f;
    }

    private static String trimOrNull(Object v) {
        if (v == null) return null;
        String s = String.valueOf(v);
        return s == null ? null : s.trim();
    }

    private static Object coerce(Object v, Schema.DisplayType t) {
        if (v == null) return null;
        try {
            switch on t {
                when Date       { return (v instanceof Date) ? v : Date.valueOf(String.valueOf(v)); }
                when DateTime   { return (v instanceof Datetime) ? v : Datetime.valueOf(String.valueOf(v)); }
                when Boolean    { return (v instanceof Boolean) ? v : Boolean.valueOf(String.valueOf(v)); }
                when Double     { return (v instanceof Decimal) ? ((Decimal)v).doubleValue() : Double.valueOf(String.valueOf(v)); }
                when Currency   { return Decimal.valueOf(String.valueOf(v)); }
                when Percent    { return Decimal.valueOf(String.valueOf(v)); }
                when Integer    { return Integer.valueOf(String.valueOf(v)); }
                when Long       { return Long.valueOf(String.valueOf(v)); }
                when Id         { return String.valueOf(v); }
                when Picklist   { return String.valueOf(v); }
                when Multipicklist {
                    if (v instanceof List<Object>) return String.join((List<Object>)v, ';');
                    return String.valueOf(v);
                }
                when Base64     { return Blob.valueOf(String.valueOf(v)); }
                when else       { return String.valueOf(v); }
            }
        } catch (Exception e) {
            return String.valueOf(v);
        }
    }

    // =========================
    // Public helpers (as-is)
    // =========================
    @AuraEnabled
    public static String getGUID(){
       return ds_PortalNoqodiUtilityClass.generateUUID();
    }

    @AuraEnabled
    public static void deleteUBORecs(List<String> uboIds, String objectApiName) {
        if (uboIds == null || uboIds.isEmpty() || String.isBlank(objectApiName)) return;
        String soql = 'SELECT Id FROM ' + objectApiName + ' WHERE External_Id__c IN :uboIds';
        List<SObject> recs = Database.query(soql);
        if (!recs.isEmpty()) delete recs;
    }

    public class ViewOnlyInitDTO {
        @AuraEnabled public String relationshipsJson;
        @AuraEnabled public Id serviceRequestId;   // Onboard_Request__c
        @AuraEnabled public Id actionTempId;       // acbox__Action_Template__c (from Onboard_Request__c)
        @AuraEnabled public Id currentFlowId;      // APF entry id with acbox__Unique_Key__c = 'SHAREHOLDER_APF'
    }

    @AuraEnabled(cacheable=true)
    public static ViewOnlyInitDTO getRelationshipsAndParams(Id recordId, String objectApiName, String fieldApiName) {
        if (recordId == null || String.isBlank(objectApiName) || String.isBlank(fieldApiName)) return null;

        String soql = 'SELECT ' + fieldApiName + ', Onboard_Request__c FROM ' + objectApiName + ' WHERE Id = :recordId';
        SObject rec = Database.query(soql);

        String relationshipsJson = (String) rec.get(fieldApiName);
        Id serviceRequestId = (Id) rec.get('Onboard_Request__c');

        Id actionTemplateId;
        if (serviceRequestId != null) {
            Onboard_Request__c sr = [
                SELECT Action_Template__c
                FROM Onboard_Request__c
                WHERE Id = :serviceRequestId
                LIMIT 1
            ];
            actionTemplateId = sr.Action_Template__c;
        }

        Id currentFlowId;
        if (actionTemplateId != null) {
            List<acbox__Action_Template__c> tmp = [
                SELECT Id,
                       (SELECT Id
                        FROM acbox__Action_Page_Flows__r
                        WHERE acbox__Unique_Key__c = 'SHAREHOLDER_APF'
                        ORDER BY CreatedDate ASC
                        LIMIT 1)
                FROM acbox__Action_Template__c
                WHERE Id = :actionTemplateId
                LIMIT 1
            ];
            if (!tmp.isEmpty() && !tmp[0].acbox__Action_Page_Flows__r.isEmpty()) {
                currentFlowId = tmp[0].acbox__Action_Page_Flows__r[0].Id;
            }
        }

        ViewOnlyInitDTO dto = new ViewOnlyInitDTO();
        dto.relationshipsJson = relationshipsJson;
        dto.serviceRequestId = serviceRequestId;
        dto.actionTempId = actionTemplateId;
        dto.currentFlowId = currentFlowId;
        return dto;
    }

    @AuraEnabled(cacheable=true)
    public static Map<String, String> getNamesByIds(List<String> ids) {
        Map<String, String> result = new Map<String, String>();
        if (ids == null || ids.isEmpty()) return result;

        Set<Id> validIds = new Set<Id>();
        for (String s : ids) {
            if (String.isBlank(s)) continue;
            try { validIds.add((Id)s); } catch (Exception ignore) {}
        }
        if (validIds.isEmpty()) return result;

        Map<String, List<Id>> byType = new Map<String, List<Id>>();
        for (Id i : validIds) {
            String apiName = i.getSObjectType().getDescribe().getName();
            List<Id> bucket = byType.get(apiName);
            if (bucket == null) { bucket = new List<Id>(); byType.put(apiName, bucket); }
            bucket.add(i);
        }

        for (String apiName : byType.keySet()) {
            Map<String, Schema.SObjectField> m = fmap(apiName);
            String nameApi = m.containsKey('Name') ? 'Name' : 'Id';
            if (nameApi == 'Id') {
                for (Schema.SObjectField f : m.values()) {
                    Schema.DescribeFieldResult fd = f.getDescribe();
                    if (fd.getType() == Schema.DisplayType.String && !fd.isCalculated()) {
                        nameApi = fd.getName();
                        break;
                    }
                }
            }
            List<Id> idsForType = byType.get(apiName);
            if (idsForType == null || idsForType.isEmpty()) continue;

            String soql = 'SELECT Id,' + nameApi + ' FROM ' + apiName + ' WHERE Id IN :idsForType';
            for (SObject row : Database.query(soql)) {
                result.put((String)row.get('Id'), (String)row.get(nameApi));
            }
        }
        return result;
    }

    // =========================
    // DTOs
    // =========================
    public class CreateOrUpsertInput {
        @AuraEnabled public String externalKey;          // required
        @AuraEnabled public String parentExternalKey;    // optional
        @AuraEnabled public Id     parentId;             // optional
        @AuraEnabled public String status;               // optional
        @AuraEnabled public Map<String,Object> fields;   // dynamic business fields (only __c keys)
        @AuraEnabled public String serviceRequestId;     // optional
        @AuraEnabled public Integer order;
        @AuraEnabled public Integer depth;
        @AuraEnabled public String  path;
    }
    public class SaveTreeInput {
        @AuraEnabled public Id     rootId;
        @AuraEnabled public String relationshipsJson;
        @AuraEnabled public List<String> deletedExternalKeys;
        @AuraEnabled public Boolean finalizeAll;
    }
    private class NodeDTO {
        public String id;
        public String companyName;
        public String type;
        public String Country;
        public Map<String,Object> details;
        public List<NodeDTO> uboList;
    }

    // =======================================================
    // 1) Create/Upsert a single UBO node (DYNAMIC)
    // =======================================================
@AuraEnabled
public static SObject createOrUpsertUboNode(String inputJson, String objectApiName) {
    try {
        if (String.isBlank(inputJson))      throw new AuraHandledException('inputJson is blank');
        if (String.isBlank(objectApiName))  throw new AuraHandledException('objectApiName is required');

        // Per-object config + describe
        ObjCfg cfg = cfgFor(objectApiName);
        Map<String, Schema.SObjectField> fields = fmap(cfg.objectApiName);

        // ---- parse input ----
        Map<String, Object> raw = (Map<String, Object>) JSON.deserializeUntyped(inputJson);

        String externalKey       = trimOrNull(raw.get('externalKey'));
        String parentExternalKey = trimOrNull(raw.get('parentExternalKey'));
        String status            = trimOrNull(raw.get('status'));
        String path              = trimOrNull(raw.get('path'));
        String serviceRequestId  = trimOrNull(raw.get('serviceRequestId'));

        if (String.isBlank(externalKey))
            throw new AuraHandledException('externalKey is required');

        Map<String,Object> inputFields =
            (raw.get('fields') instanceof Map<String,Object>)
            ? (Map<String,Object>) raw.get('fields')
            : new Map<String,Object>();

        // ---- find existing OR create new ----
        String soql = 'SELECT Id,' + cfg.externalIdField +
                      (fields.containsKey(cfg.parentLookupField)         ? (','+cfg.parentLookupField)         : '') +
                      (fields.containsKey(cfg.provisionalParentKeyField) ? (','+cfg.provisionalParentKeyField) : '') +
                      (fields.containsKey(cfg.statusField)               ? (','+cfg.statusField)               : '') +
                      ' FROM ' + cfg.objectApiName +
                      ' WHERE ' + cfg.externalIdField + ' = :externalKey LIMIT 1';

        SObject rec;
        List<SObject> found = Database.query(soql);
        Boolean isInsert = found.isEmpty();
        if (isInsert) {
            rec = Schema.getGlobalDescribe().get(cfg.objectApiName).newSObject();
        } else {
            rec = found[0];
        }

        // always set external id
        rec.put(cfg.externalIdField, externalKey);

        // ---- safely set Service Request lookup (prevents "not editable" on update) ----
        if (String.isNotBlank(serviceRequestId) && fields.containsKey(cfg.serviceRequestLookupField)) {
            Schema.DescribeFieldResult fd = fields.get(cfg.serviceRequestLookupField).getDescribe();
            if ((isInsert && fd.isCreateable()) || (!isInsert && fd.isUpdateable())) {
                rec.put(cfg.serviceRequestLookupField, serviceRequestId);
            }
        }

        // ---- parent linking by provisional key (actual linking resolved later) ----
        if (String.isNotBlank(parentExternalKey) && fields.containsKey(cfg.provisionalParentKeyField)) {
            Schema.DescribeFieldResult fd = fields.get(cfg.provisionalParentKeyField).getDescribe();
            if ((isInsert && fd.isCreateable()) || (!isInsert && fd.isUpdateable())) {
                rec.put(cfg.provisionalParentKeyField, parentExternalKey);
            }
        }

        // ---- status (e.g., Draft) ----
        if (String.isNotBlank(status) && fields.containsKey(cfg.statusField)) {
            Schema.DescribeFieldResult fd = fields.get(cfg.statusField).getDescribe();
            if ((isInsert && fd.isCreateable()) || (!isInsert && fd.isUpdateable())) {
                rec.put(cfg.statusField, status);
            }
        }

        // ---- ✅ RecordType from shareholder picklist (the bit you flagged) ----
       List<String> typeKeys = new List<String>{
            cfg.shareholderTypePicklistField, // if configured
            'Ubo_Type__c',
            'Shareholder_Type__c'
        };
        String rtKey;
        for (String k : typeKeys) {
            if (String.isBlank(k)) continue;
            Object v = inputFields.get(k);
            if (v != null) { rtKey = String.valueOf(v); break; }
        }
        if (!String.isBlank(rtKey)) {
            Schema.DescribeSObjectResult sd = d(cfg.objectApiName);
            Schema.RecordTypeInfo rti = sd.getRecordTypeInfosByDeveloperName().get(rtKey);
            if (rti == null) rti = sd.getRecordTypeInfosByName().get(rtKey);
            if (rti != null) {
                rec.put('RecordTypeId', rti.getRecordTypeId());
            }
        }

        // ---- dynamic business fields (only those that are real & updateable/createable) ----
        if (!inputFields.isEmpty()) {
            for (String api : inputFields.keySet()) {
                if (api == null || api.endsWith('__label')) continue;        // UI labels → ignore
                if (!fields.containsKey(api))         continue;               // unknown field → ignore

                Schema.DescribeFieldResult fd = fields.get(api).getDescribe();
                if ((isInsert && !fd.isCreateable()) || (!isInsert && !fd.isUpdateable())) continue;

                rec.put(api, coerce(inputFields.get(api), fd.getType()));
            }
        }

        // ---- upsert by external id ----
        Database.UpsertResult ur = Database.upsert(rec, fld(cfg.objectApiName, cfg.externalIdField), true);
        if (!ur.isSuccess()) {
            Database.Error e = ur.getErrors()[0];
            throw new AuraHandledException('UBO upsert failed: ' + e.getMessage());
        }
        return rec;

    } catch (Exception e) {
        throw new AuraHandledException('UBO upsert failed: ' + e.getMessage());
    }
}


    // =======================================================
    // 2) Commit the tree (DYNAMIC)
    // =======================================================
@AuraEnabled
public static Id commitUboTree(
    Id parentId,
    Object nodesParam,                 // can be a JSON string or a JS object/array
    String treeJson,                   // raw snapshot (already JSON)
    List<String> deletedExternalIds,
    String objectApiName
) {
    // ---- 0) Validate basic inputs ----
    if (String.isBlank(objectApiName)) {
        throw new AuraHandledException('objectApiName is required');
    }
    if (parentId == null) {
        throw new AuraHandledException('Parent Id is required.');
    }

    // ---- 1) Load object config & describe map once ----
    ObjCfg cfg = cfgFor(objectApiName);
    Map<String, Schema.SObjectField> cfgFields = fmap(cfg.objectApiName);

    // ---- 2) Normalize nodesParam into a List<Map<String,Object>> (accepts JSON string or object/array) ----
    List<Map<String, Object>> nodeMaps = new List<Map<String, Object>>();
    if (nodesParam != null) {
        Object parsed;

        // If caller passed a JSON string, parse it first
        if (nodesParam instanceof String) {
            String raw = (String)nodesParam;
            parsed = String.isBlank(raw) ? null : JSON.deserializeUntyped(raw);
        } else {
            // If caller passed an object/array, round-trip to force platform-friendly shapes
            parsed = JSON.deserializeUntyped(JSON.serialize(nodesParam));
        }

        if (parsed instanceof List<Object>) {
            for (Object o : (List<Object>)parsed) {
                if (o instanceof Map<String, Object>) nodeMaps.add((Map<String, Object>)o);
            }
        } else if (parsed instanceof Map<String, Object>) {
            nodeMaps.add((Map<String, Object>)parsed);
        }
    }
    if (deletedExternalIds == null) deletedExternalIds = new List<String>();

    // If nothing to do (and nothing to delete), just snapshot (if requested) and return
    if ((nodeMaps == null || nodeMaps.isEmpty()) && deletedExternalIds.isEmpty()) {
        if (String.isNotBlank(treeJson) && cfgFields.containsKey(cfg.jsonSnapshotField)) {
            SObject parent = Schema.getGlobalDescribe().get(cfg.objectApiName).newSObject();
            parent.put('Id', parentId);
            parent.put(cfg.jsonSnapshotField, treeJson);
            update parent;
        }
        return parentId;
    }

    // ---- 3) Collect all external ids up front (needed for robust id resolution & root detection) ----
    Set<String> allExt = new Set<String>();
    for (Map<String, Object> m : nodeMaps) {
        if (m == null) continue;
        Object v = m.get(cfg.externalIdField);
        if (v != null) allExt.add(String.valueOf(v));
    }

    // Map of external id -> existing Id BEFORE we modify anything (lets us detect the root reliably)
    Map<String, Id> preExisting = new Map<String, Id>();
    if (!allExt.isEmpty()) {
        String sel = 'SELECT Id,' + cfg.externalIdField +
                     ' FROM ' + cfg.objectApiName +
                     ' WHERE ' + cfg.externalIdField + ' IN :allExt';
        for (SObject r : Database.query(sel)) {
            preExisting.put((String)r.get(cfg.externalIdField), (Id)r.get('Id'));
        }
    }

    // ---- 4) Rehydrate each map into a concrete SObject and coerce types safely ----
    Schema.SObjectType tgtType = Schema.getGlobalDescribe().get(cfg.objectApiName);
    if (tgtType == null) throw new AuraHandledException('Unknown object: ' + cfg.objectApiName);

    List<SObject> sNodes = new List<SObject>();
    Pattern idPattern = Pattern.compile('^[a-zA-Z0-9]{15,18}$');

    for (Map<String, Object> m : nodeMaps) {
        SObject row = tgtType.newSObject();
        if (m != null) {
            for (String api : m.keySet()) {
                // Skip unknown fields and any convenience __label keys
                if (api == null || api.endsWith('__label') || !cfgFields.containsKey(api)) continue;

                Schema.DescribeFieldResult fd = cfgFields.get(api).getDescribe();
                Schema.DisplayType t = fd.getType();
                Object val = m.get(api);

                // For lookup fields, only accept a valid 15/18-char Salesforce Id; otherwise ignore silently
                if (t == Schema.DisplayType.Reference) {
                    if (val instanceof String) {
                        String sval = (String)val;
                        Matcher mm = idPattern.matcher(sval);
                        if (mm.matches()) row.put(api, sval);
                    }
                    continue; // never fall through to coerce() for references
                }

                // Coerce everything else via the central converter (Date/Datetime/Number/etc.)
                row.put(api, coerce(val, t));
            }
        }
        sNodes.add(row);
    }

    // ---- 5) Auto-link top-level nodes to the parent, but NEVER self-link the root ----
    // A node is considered "root" if its external id already exists and equals parentId.
    if (cfgFields.containsKey(cfg.parentLookupField)) {
        for (SObject n : sNodes) {
            String ext = (String) n.get(cfg.externalIdField);
            Boolean isRootRecord = (ext != null && preExisting.get(ext) == parentId);

            Boolean hasProv = cfgFields.containsKey(cfg.provisionalParentKeyField)
                              && String.isNotBlank((String)n.get(cfg.provisionalParentKeyField));

            if (!isRootRecord && !hasProv && n.get(cfg.parentLookupField) == null) {
                n.put(cfg.parentLookupField, parentId);
            }
        }
    }

    // ---- 6) Ensure external id present and default status = Draft if blank ----
    for (SObject n : sNodes) {
        String ext = (String) n.get(cfg.externalIdField);
        if (String.isBlank(ext)) {
            throw new AuraHandledException('Each node must have ' + cfg.externalIdField + '.');
        }
        if (cfgFields.containsKey(cfg.statusField) && String.isBlank((String)n.get(cfg.statusField))) {
            n.put(cfg.statusField, 'Draft');
        }
    }

    // ---- 7) Upsert all nodes by external id (allow partial success) ----
    Database.UpsertResult[] ups = Database.upsert(
        sNodes,
        fld(cfg.objectApiName, cfg.externalIdField),
        /* allOrNone */ false
    );

    // ---- 8) Build ext -> Id map for ALL externals (not just successful upserts) ----
    Map<String, Id> ext2Id = new Map<String, Id>();

    // Seed with any successes from this upsert
    for (Integer i = 0; i < sNodes.size(); i++) {
        if (ups[i].isSuccess()) {
            String ext = (String) sNodes[i].get(cfg.externalIdField);
            ext2Id.put(ext, ups[i].getId());
        }
    }

    // Fill gaps by querying ALL externals (covers: preexisting, failed upserts, the root, etc.)
    if (!allExt.isEmpty()) {
        String sel = 'SELECT Id,' + cfg.externalIdField +
                     ' FROM ' + cfg.objectApiName +
                     ' WHERE ' + cfg.externalIdField + ' IN :allExt';
        for (SObject r : Database.query(sel)) {
            ext2Id.put((String)r.get(cfg.externalIdField), (Id)r.get('Id'));
        }
    }
     Set<String> extKeys = ext2Id.keySet();
    // ---- 9) Resolve deeper children: set parent lookup from Provisional_Parent_Key__c ----
    if (cfgFields.containsKey(cfg.provisionalParentKeyField) && cfgFields.containsKey(cfg.parentLookupField) && !ext2Id.isEmpty()) {
        List<SObject> toLink = new List<SObject>();
        String sel = 'SELECT Id,' + cfg.externalIdField + ',' + cfg.parentLookupField + ',' + cfg.provisionalParentKeyField +
                     ' FROM ' + cfg.objectApiName +
                     ' WHERE ' + cfg.externalIdField + ' IN :extKeys';
        for (SObject row : Database.query(sel)) {
            if (row.get(cfg.parentLookupField) == null) {
                String prov = (String) row.get(cfg.provisionalParentKeyField);
                if (String.isNotBlank(prov)) {
                    Id pid = ext2Id.get(prov);
                    if (pid != null) {
                        row.put(cfg.parentLookupField, pid);
                        row.put(cfg.provisionalParentKeyField, null);
                        toLink.add(row);
                    }
                }
            }
        }
        if (!toLink.isEmpty()) update toLink;
    }

    // ---- 10) Deletes by external id (if any) ----
    if (!deletedExternalIds.isEmpty()) {
        String sel = 'SELECT Id FROM ' + cfg.objectApiName +
                     ' WHERE ' + cfg.externalIdField + ' IN :deletedExternalIds';
        List<SObject> toDelete = Database.query(sel);
        if (!toDelete.isEmpty()) delete toDelete;
    }

    // ---- 11) Snapshot JSON on parent (if field exists) ----
    if (String.isNotBlank(treeJson) && cfgFields.containsKey(cfg.jsonSnapshotField)) {
        SObject parent = tgtType.newSObject();
        parent.put('Id', parentId);
        parent.put(cfg.jsonSnapshotField, treeJson);
        update parent;
    }

    return parentId;
}







    // =========================
    // (Optional) local helpers you already used
    // =========================
    private static NodeDTO parseNode(Map<String,Object> m) {
        NodeDTO n = new NodeDTO();
        n.id = (String) m.get('id');
        n.companyName = (String) m.get('companyName');
        n.type = (String) m.get('type');
        n.Country = (String) m.get('Country');
        n.details = (Map<String,Object>) m.get('details');
        if (n.details == null) n.details = new Map<String,Object>();
        List<Object> kids = (List<Object>) m.get('uboList');
        n.uboList = new List<NodeDTO>();
        if (kids != null) for (Object o : kids) n.uboList.add(parseNode((Map<String,Object>)o));
        return n;
    }
    private static void walk(NodeDTO node, String parentKey, Integer order, Integer depth, String parentPath, List<NodeDTO> flat) {
        if (node == null) return;
        String path = String.isBlank(parentPath) ? node.id : parentPath + '/' + node.id;
        node.details.put('_parentKey', parentKey);
        node.details.put('UBO_Node_Order__c', order);
        node.details.put('UBO_Node_Depth__c', depth);
        node.details.put('UBO_Node_Path__c', path);
        flat.add(node);
        for (Integer i = 0; i < (node.uboList == null ? 0 : node.uboList.size()); i++) {
            walk(node.uboList[i], node.id, i, depth + 1, path, flat);
        }
    }

    // ===== File upload (ContentVersion + link) =====
    @AuraEnabled
    public static Id uploadAttachment(Id parentId, String fileName, String base64Data) {
        if (parentId == null) {
            throw new AuraHandledException('Parent Id is required for file upload.');
        }
        if (String.isBlank(fileName) || String.isBlank(base64Data)) {
            throw new AuraHandledException('File name and file data are required.');
        }

        Blob body;
        try {
            body = EncodingUtil.base64Decode(base64Data);
        } catch (Exception e) {
            throw new AuraHandledException('Invalid file data.');
        }

        // Title = filename without extension
        String title = fileName;
        Integer dot = fileName.lastIndexOf('.');
        if (dot > 0) title = fileName.substring(0, dot);

        ContentVersion cv = new ContentVersion(
            Title        = title,
            PathOnClient = fileName,
            VersionData  = body
        );
        insert cv;

        // Fetch the ContentDocumentId from the inserted version
        cv = [SELECT Id, ContentDocumentId FROM ContentVersion WHERE Id = :cv.Id LIMIT 1];

        // Link the document to the parent record
        ContentDocumentLink cdl = new ContentDocumentLink(
            ContentDocumentId = cv.ContentDocumentId,
            LinkedEntityId    = parentId,
            ShareType         = 'V',
            Visibility        = 'AllUsers'
        );
        insert cdl;

        return cv.ContentDocumentId;
    }

    @AuraEnabled
    public static Integer deleteDraftNodesForServiceRequest(
        Id serviceRequestId,
        String objectApiName,
        Id rootAmendmentId // optional: pass the tree's root OB_Amendment__c Id to be extra safe
    ) {
        if (serviceRequestId == null || String.isBlank(objectApiName)) return 0;

        ObjCfg cfg = cfgFor(objectApiName);
        Map<String, Schema.SObjectField> f = fmap(cfg.objectApiName);

        // Build a selective WHERE:
        // - Same SR
        // - Status = 'Draft' (when present)
        // - Is a NODE: has parent lookup OR provisional parent key (root typically has neither)
        // - Exclude the explicit root id if provided
        String soql = 'SELECT Id FROM ' + cfg.objectApiName +
                    ' WHERE ' + cfg.serviceRequestLookupField + ' = :serviceRequestId';

        if (f.containsKey(cfg.statusField)) {
            soql += ' AND ' + cfg.statusField + ' = \'Draft\'';
        }

        Boolean hasParent = f.containsKey(cfg.parentLookupField);
        Boolean hasProv   = f.containsKey(cfg.provisionalParentKeyField);

        // Only delete “nodes”
        if (hasParent || hasProv) {
            List<String> nodeConds = new List<String>();
            if (hasParent) nodeConds.add(cfg.parentLookupField + ' != NULL');
            if (hasProv)   nodeConds.add(cfg.provisionalParentKeyField + ' != NULL');
            soql += ' AND (' + String.join(nodeConds, ' OR ') + ')';
        }

        if (rootAmendmentId != null) {
            soql += ' AND Id != :rootAmendmentId';
        }

        List<SObject> recs = Database.query(soql);
        if (!recs.isEmpty()) delete recs;
        return recs.size();
    }

public class FormDetails {
    @AuraEnabled public acbox__Section__c section { get; set; }
    @AuraEnabled public List<acbox__Section_Detail__c> sectionDetails { get; set; }
    public FormDetails() { sectionDetails = new List<acbox__Section_Detail__c>(); }
}

   @AuraEnabled
public static List<FormDetails> getUboSectionsOnly(String actionTempId, String srId) {
    if (String.isBlank(actionTempId)) return new List<FormDetails>();

    acbox__Action_Page_Flow__c flow = [
        SELECT Id, acbox__Action_Template__r.acbox__Object_API_Name__c
          FROM acbox__Action_Page_Flow__c
         WHERE acbox__Action_Template__c = :actionTempId
           AND acbox__Unique_Key__c LIKE 'UBO_PAGE_LAYOUT%'
         LIMIT 1
    ];

    List<acbox.PageFlowFields> raw =
        acbox.RequestFormcontroller.getSectionsAndFields(
            srId,
            flow.Id,
            flow.acbox__Action_Template__r.acbox__Object_API_Name__c
        );
    System.debug('raw: ' + raw);
    List<FormDetails> out = new List<FormDetails>();
    for (acbox.PageFlowFields section : raw) {
        if (section == null) continue;
        FormDetails details = new FormDetails();
        details.section = section.ObjSection;                 // keep entire section record
        for (acbox__Section_Detail__c sd : section.ListSectionDetail) {
            details.sectionDetails.add(sd);                  // keep all details
        }
        out.add(details);
    }
    return out;
}



}