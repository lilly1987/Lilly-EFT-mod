"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
//Config file
const modConfig = require("../config.json");
//Item template file
const itemTemplate = require("../templates/item_template.json");
class Lilly {
    preAkiLoad(container){
        this.logger = container.resolve("WinstonLogger");
        this.jsonUtil = container.resolve("JsonUtil");
        
        this.modFolderName = "Lilly";
        this.modFullName = "Lilly";
        
        //this.logger.info(this.logger);
        this.logger.info("Loading: " + this.modFullName);
        
        const staticRouterModService = container.resolve("StaticRouterModService");
        staticRouterModService.registerStaticRouter(this.modFullName, [
            //{
            //    url: "/client/items",
            //    action: (url, info, sessionID, output) => {
            //        try {
            //        this.logger.logWithColor(output, "yellow");
            //        this.logger.logWithColor(info, "magenta");
            //        this.logger.logWithColor(`Lilly : ${url}.`, "cyan");
            //        }
            //        catch (error) {
            //            this.logger.error(error.message);
            //        }
            //        return output;
            //    }
            //},
            {
                url: "/quests/zones/getZones",
                action: (url, info, sessionID, output) => {
                    try {
                    this.logger.logWithColor(output, "yellow");
                    this.logger.logWithColor(info, "magenta");
                    this.logger.logWithColor(`Lilly : ${url}.`, "cyan");
                    }
                    catch (error) {
                        this.logger.error(error.message);
                    }
                    return output;
                }
            }
        ], "aki");
        
        this.logger.logWithColor(`Lilly : preAkiLoad finished.`,"blue");
    }

    preDBLoad(container) {        
        this.logger.logWithColor(`Lilly : preDBLoad finished.`,"blue");
    }
    postDBLoad(container) {
        const databaseServer = container.resolve("DatabaseServer");
        const databaseImporter = container.resolve("ImporterUtil");
        const modLoader = container.resolve("PreAkiModLoader");
        //Mod Info
        //Trader IDs
        const traders = {
            "MFACSHOP": "MFACSHOP"
            //"prapor": "54cb50c76803fa8b248b4571",
            //"therapist": "54cb57776803fa99248b456e",
            //"skier": "58330581ace78e27b8b10cee",
            //"peacekeeper": "5935c25fb3acc3127c3d8cd9",
            //"mechanic": "5a7c2eca46aef81a7ca2145d",
            //"ragman": "5ac3b934156ae10c4430e83c",
            //"jaeger": "5c0647fdd443bc2504c2d371"
        };
        
        

        //Get the server database and our custom database
        this.db = databaseServer.getTables();
        this.mydb = databaseImporter.loadRecursive(`${modLoader.getModPath(this.modFolderName)}database/`);
        
        

        
        // loop
        if (modConfig.loopItem){
            const loop_mmIDd={}; // mmID : [[loopID,mmID+"_"+loopID],,, ]
            this.loopItem(traders,loop_mmIDd);
            this.logger.logWithColor(`${this.modFolderName} loop finished.`, "green");
            this.loopItemLocales(loop_mmIDd);
            this.logger.logWithColor(`Lilly : loop Locales finished.`,"green");
        }else{
            this.logger.logWithColor(`${this.modFolderName} loop off.`, "yellow");
        }
        
        //Locales (Languages)
        this.addLocales();
        this.logger.debug(this.modFolderName + " locales finished");
        
        //Items + Handbook
        for (const [mmID, mmItem] of Object.entries(this.mydb.mm_items)) {
            if ("clone" in mmItem) {
                this.cloneItem(mmItem.clone, mmID);
                this.copyToFilters(mmItem.clone, mmID);
                this.addToFilters(mmID);
            }
            else {
                this.createItem(mmID);
                this.addToFilters(mmID);
            }
        }
        this.logger.debug(this.modFolderName + " items and handbook finished");
        
        //Clothing
        for (const newArticle in this.mydb.mm_clothes)
            this.cloneClothing(this.mydb.mm_clothes[newArticle].clone, newArticle);
        this.logger.debug(this.modFolderName + " clothing finished");
        //Presets
        for (const preset in this.mydb.globals.ItemPresets)
            this.db.globals.ItemPresets[preset] = this.mydb.globals.ItemPresets[preset];
        this.logger.debug(this.modFolderName + " presets finished");
        //Traders
        for (const trader in traders)
            this.addTraderAssort(traders[trader]);
        
        if ( "ragman" in traders && "suits" in this.mydb.traders[traders["ragman"]])
            for (const suit of this.mydb.traders[traders["ragman"]].suits)
                this.db.traders[traders["ragman"]].suits.push(suit);

        this.logger.debug(this.modFolderName + " traders finished");
        //Mastery
        const dbMastering = this.db.globals.config.Mastering;
        for (const weapon in this.mydb.globals.config.Mastering)
            dbMastering.push(this.mydb.globals.config.Mastering[weapon]);
        for (const weapon in dbMastering) {
        }
        //for (const weapon in dbMastering) {}
        this.logger.debug(this.modFolderName + " mastery finished");
        //Stimulator buffs
        for (const sbuffs in this.mydb.globals.config.Health.Effects.Stimulator.Buffs)
            this.db.globals.config.Health.Effects.Stimulator.Buffs[sbuffs] = this.mydb.globals.config.Health.Effects.Stimulator.Buffs[sbuffs];
        //for (const buffs in buffs) {}
        this.logger.debug(this.modFolderName + " buffs finished");
        
        this.logger.logWithColor(`Lilly : postDBLoad finished.`,"blue");
    }
    postAkiLoad(container) {
        this.props=[];
        this.weaps=[];
        this.weapsSlots=[];
        this.ammoCaliber={};
        this.weapClass={
            "grenadeLauncher":[],
            "pistol":[],
            "smg":[],
            "shotgun":[],
            "machinegun":[],
            "sniperRifle":[],
            "marksmanRifle":[],
            "assaultCarbine":[],
            "assaultRifle":[]
        };
        this.weapUseType={
            "primary":[],
            "secondary":[]
        };
        this.ReloadMagType={
            "ExternalMagazine":[],
            "InternalMagazine":[]
        };
        this.ReloadMode={
            "OnlyBarrel":[],
            "ExternalMagazine":[],
            "InternalMagazine":[]
        };
        for (const [id, values] of Object.entries(this.db.templates.items)) {
            if( !("_props" in values ))
                continue;
            this.props.push(values._props);
            if( "weapClass" in values._props ){
                this.weaps.push(values._props);
            }
            this.todict(this.ammoCaliber,"ammoCaliber",values)
            this.todict(this.weapClass,"weapClass",values)
            this.todict(this.weapUseType,"weapUseType",values)
            this.todict(this.ReloadMagType,"ReloadMagType",values)
            this.todict(this.ReloadMode,"ReloadMode",values)
        }
        // Magazine
        if (modConfig.MagazineCartridgesMulti != 1){
            this.multiMagazine();
            this.logger.logWithColor(`${this.modFolderName} multi Magazine finished.`, "green");
        }else{
            this.logger.logWithColor(`${this.modFolderName} multi Magazine off.`, "yellow");
        }
        if (modConfig.ExtraSizeZero){
            this.ExtraSizeZero();
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeZero finished.`, "green");
        }else{
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeZero off.`, "yellow");
        }
        if (modConfig.Size1){
            this.Size1();
            this.logger.logWithColor(`${this.modFolderName} Size1 finished.`, "green");
        }else{
            this.logger.logWithColor(`${this.modFolderName} Size1 off.`, "yellow");
        }
        
        ///
        if (modConfig.debug){
            this.logger.logWithColor(this.db.templates.items["Lilly.45"], "cyan");        
            for (const [id, values] of Object.entries(this.weapUseType)) {
                for (const item of values) {
                    this.logger.logWithColor(`weapUseType ; ${id} ; ${item.ShortName} ;`, "cyan");
                }
            }
            for (const [id, values] of Object.entries(this.ReloadMagType)) {
                for (const item of values) {
                    this.logger.logWithColor(`ReloadMagType ; ${id} ; ${item.ShortName} ;`, "cyan");
                }
            }
            for (const [id, values] of Object.entries(this.ReloadMode)) {
                for (const item of values) {
                    this.logger.logWithColor(`ReloadMode ; ${id} ; ${item.ShortName} ;`, "cyan");
                }
            }
        }
        
        if (modConfig.fullauto)
            for (const prop of this.weaps){
                if ( !( prop.weapFireType.includes( "fullauto" ))){
                    //this.logger.logWithColor(prop, "cyan");
                    prop.weapFireType.push("fullauto");
                }
            }
        
        this.logger.logWithColor(`Lilly : postAkiLoad finished.`,"blue");
        
        
    }
    Size1(){
        let myprops=this.props;
        if (modConfig.SizeExcludeWeaps)
            myprops = myprops.filter( ( el ) => !this.weaps.includes( el ) );
        
        if (modConfig.SizeHeight1)
            for (const prop of myprops){
                prop.Height=1;
            }
        if (modConfig.SizeWidth1)
            for (const prop of myprops){
                prop.Width=1;
            }
        if (modConfig.WeapsSizeHeight1)
            for (const prop of this.weaps){
                prop.Height=1;
            }
        if (modConfig.WeapsSizeWidth1)
            for (const prop of this.weaps){
                prop.Width=1;
            }

    }
    
    todict(arr,name,values){
        if( name in values._props ){
            if ( values._props[name] in arr){
                arr[values._props[name]].push(values);
            }else{
                arr[values._props[name]]=[values];
            }
        }
    }
    ExtraSizeZero(){
        if (modConfig.ExtraSizeLeftZero){
            for (const prop of this.props)
                prop.ExtraSizeLeft=0;
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeLeftZero finished.`, "green");
        }else
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeLeftZero off.`, "yellow");
        if (modConfig.ExtraSizeDownZero){
            for (const prop of this.props)
                prop.ExtraSizeDown=0;
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeDownZero finished.`, "green");
        }else
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeDownZero off.`, "yellow");
        if (modConfig.ExtraSizeUpZero){
            for (const prop of this.props)
                prop.ExtraSizeUp=0;
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeUpZero finished.`, "green");
        }else
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeUpZero off.`, "yellow");
        if (modConfig.ExtraSizeRightZero){
            for (const prop of this.props)
                prop.ExtraSizeRight=0;
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeRightZero finished.`, "green");
        }else
            this.logger.logWithColor(`${this.modFolderName} ExtraSizeRightZero off.`, "yellow");

    }
    multiMagazine(){
        for (const [id, values] of Object.entries(this.db.templates.items)) {
            if( !("_props" in values ))
                continue;
            const _props=values._props;
            if( !("Cartridges" in _props ))
                continue;
            //this.logger.logWithColor(`${id}`, "gray");
            const Cartridges=_props.Cartridges;
            //this.logger.logWithColor(`${Cartridges.length}`, "gray");
            if (Cartridges.length==0 || _props.Slots.length>0)
                continue;
            for (const mag of Cartridges){
                //this.logger.logWithColor(`${mag._max_count}`, "gray");
                mag._max_count*=modConfig.MagazineCartridgesMulti;
            }
            if (modConfig.MagazineCartridgesSize){
                _props.Height=1;
                _props.Width=1;
                _props.ExtraSizeLeft=0;
                _props.ExtraSizeDown=0;
                _props.ExtraSizeUp=0;
                _props.ExtraSizeRight=0;
            }
            //this.logger.logWithColor(values, "cyan");
            //this.logger.logWithColor(`Lilly Magazine set : ${values._name}`, "cyan");
        }
    }
    loopItem(traders,loop_mmIDd){
        // ================================== loop ==================================
        // color
        const lcolor = ["default","orange","violet","grey","black","green","blue","yellow","red"
        ,"tracerRed","tracerGreen","tracerYellow"
        ];
        const loop_mmIDs=[];
        const loop_mmIDsDel=[];
        
        // loop item
        for (const [mmID, mmItem] of Object.entries(this.mydb.mm_items)) {
            
            // RainbowColor copy to loop
            if (modConfig.RainbowColor && "RainbowColor" in mmItem && mmItem["RainbowColor"] ){
                if  ("loop" in mmItem) {
                    for (const [key, value] of Object.entries(mmItem["loop"])) {
                        for (const ccolor of lcolor){
                            let cvalue=this.jsonUtil.clone(value);
                            cvalue = this.compareAndReplace(cvalue, {
                                "item": {
                                    "_props": {
                                        "BackgroundColor": ccolor
                                    }
                                }
                            });
                            mmItem["loop"][key+"_"+ccolor]=cvalue;
                        }
                    }
                }else
                    mmItem["loop"]={};
                for (const ccolor of lcolor){
                    mmItem["loop"][ccolor]={
                        "item": {
                            "_props": {
                                "BackgroundColor": ccolor
                            }
                        }
                    }
                }
            }
            
            // loop make
            // this.logger.logWithColor(mmItem["loop"], "gray");
            if (! ("loop" in mmItem) ) 
                continue;
            loop_mmIDs.push(mmID);
            loop_mmIDd[mmID]=[];
            let itemDel=false;
            if ("enableThis" in mmItem && ! mmItem["enableThis"]) {
                itemDel=true;
                loop_mmIDsDel.push(mmID);
            }
            const tloop=mmItem["loop"];
            delete mmItem["loop"];
            for (const [loopID, loopItem] of Object.entries(tloop)) {
                const tloopID=mmID+"_"+loopID;
                loop_mmIDd[mmID].push([loopID,tloopID]);
                
                let cmmItem=this.jsonUtil.clone(mmItem);
                cmmItem = this.compareAndReplace(cmmItem, loopItem);
                if ( "item" in cmmItem &&  "_props" in cmmItem.item ){
                    const _props=cmmItem.item._props;
                    if ("Cartridges" in _props) this.loop_parent(_props.Cartridges,tloopID);
                    if ("StackSlots" in _props) this.loop_parent(_props.StackSlots,tloopID);
                    if ("Slots" in _props) this.loop_parent(_props.Slots,tloopID);
                    if ("Grids" in _props) this.loop_parent(_props.Grids,tloopID);
                }
                this.mydb.mm_items[tloopID]=cmmItem;
                //this.logger.logWithColor(`Lilly : loop add ${tloopID} to mm_items .`,"cyan");

            }
            if (itemDel)
                delete this.mydb.mm_items[mmID];
        }
        //this.logger.logWithColor(this.mydb.mm_items, "grey");
        //this.logger.logWithColor(loop_mmIDs, "grey");
        //this.logger.logWithColor(loop_mmIDsDel, "grey");
        //this.logger.logWithColor(loop_mmIDd, "grey");
        this.logger.logWithColor(`Lilly : loop mm_items finished.`,"green");
        
        
        // loop trader
        for (const trader in traders){
            const trader_id=traders[trader];
            if ( ! (trader_id in this.mydb.traders) || ! "assort" in this.mydb.traders[trader_id])
                continue;
            if ("items" in this.mydb.traders[trader_id].assort){
                const tarr = [];
                const tarrd = [];
                for (const item of this.mydb.traders[trader_id].assort.items) {
                    if ( loop_mmIDs.includes(item._tpl)){
                        for (const loopID of loop_mmIDd[item._tpl]) {
                            const citem=this.jsonUtil.clone(item);
                            citem._id=loopID[1];
                            citem._tpl=loopID[1];
                            tarr.push(citem);
                        }
                    }
                    if (  loop_mmIDsDel.includes(item._tpl))
                        tarrd.push(item);
                }
                this.mydb.traders[trader_id].assort["items"]=this.mydb.traders[trader_id].assort.items.filter( ( el ) => !tarrd.includes( el ) );
                this.mydb.traders[trader_id].assort.items.push(...tarr);
            }
            //this.logger.logWithColor(`${trader_id} barter_scheme.`, "green");
            if ("barter_scheme" in this.mydb.traders[trader_id].assort){
                for (const [mmID, mmItem] of Object.entries( this.mydb.traders[trader_id].assort.barter_scheme)) {
                    if (  loop_mmIDs.includes(mmID)){
                        for (const loopID of loop_mmIDd[mmID]) {
                            //this.logger.logWithColor(`mmID ${mmID} loopID ${loopID} `, "blue");
                            this.mydb.traders[trader_id].assort.barter_scheme[loopID[1]]=mmItem;
                        }
                    }
                    if (loop_mmIDsDel.includes(mmID))
                        delete this.mydb.traders[trader_id].assort.barter_scheme[mmID];
                }
            }
            //this.logger.logWithColor(`${trader_id} loyal_level_items.`, "green");
            if ("loyal_level_items" in this.mydb.traders[trader_id].assort){
                for (const [mmID, mmItem] of Object.entries(  this.mydb.traders[trader_id].assort.loyal_level_items)) {
                    if ( loop_mmIDs.includes(mmID)){
                        for (const loopID of loop_mmIDd[mmID]) {
                            //this.logger.logWithColor(`mmID ${mmID} loopID ${loopID} `, "blue");
                            this.mydb.traders[trader_id].assort.loyal_level_items[loopID[1]]=mmItem;
                        }
                    }
                    if ( loop_mmIDsDel.includes(mmID))
                        delete this.mydb.traders[trader_id].assort.loyal_level_items[mmID];
                }
            }
            //this.logger.logWithColor(`${trader_id} set.`, "green");
            //this.logger.logWithColor(this.mydb.traders[trader_id], "grey");
            //this.logger.logWithColor(`Lilly : loop add to ${trader} finished.`,"cyan");
        }
        this.logger.logWithColor(`Lilly : loop trader finished.`,"green");
        // ================================== loop ==================================
    }
    loop_parent(arr,id){
        for (const item of arr){
            item._id=id+"_"+item._name;
            item._parent=id;
        }
    }    
    setLocales(localeID,localeIDto){
        for (const entry in this.mydb.old_locales.global[localeID].templates)
            this.db.locales.global[localeIDto].templates[entry] = this.mydb.old_locales.global[localeID].templates[entry];
        for (const entry in this.mydb.old_locales.global[localeID].preset)
            this.db.locales.global[localeIDto].preset[entry] = this.mydb.old_locales.global[localeID].preset[entry];
    }
    loopItemLocalesSet(localeID,loopID,loopList,key){
        if ( loopID+" "+key in this.mydb.locales.global[localeID]){
            for (const loopL of loopList){
                if (!( loopL[1]+" "+key in this.mydb.locales.global[localeID])){
                    this.mydb.locales.global[localeID][loopL[1]+" "+key]=this.mydb.locales.global[localeID][loopID+" "+key];
                }
            }
        }
    }
    loopItemLocalesSet2(localeID,loopID,loopList,key){
        if ( loopID+" "+key in this.mydb.locales.global[localeID]){
            for (const loopL of loopList){
                if (!( loopL[1]+" "+key in this.mydb.locales.global[localeID])){
                    this.mydb.locales.global[localeID][loopL[1]+" "+key]=this.mydb.locales.global[localeID][loopID+" "+key]+" "+loopL[0];
                }
            }
        }
    }
    loopItemLocales(loop_mmIDd){
        for (const localeID in this.mydb.locales.global) {
            if (this.mydb.locales.global[localeID]) //If the locale is included in the mod, add it
            {
                for (const [loopID, loopList] of Object.entries(loop_mmIDd)) {
                    this.loopItemLocalesSet2(localeID,loopID,loopList,"Name");
                    this.loopItemLocalesSet(localeID,loopID,loopList,"ShortName");
                    this.loopItemLocalesSet(localeID,loopID,loopList,"Description");
                }
            }
        }
    }
    cloneItem(itemToClone, mmID) {
        //If the item is enabled in the json
        if (this.mydb.mm_items[mmID].enable == true) {
            //Get a clone of the original item from the database
            let atlasItemOut = this.jsonUtil.clone(this.db.templates.items[itemToClone]);
            //Change the necessary item attributes using the info in our database file mm_items.json
            atlasItemOut._id = mmID;
            atlasItemOut = this.compareAndReplace(atlasItemOut, this.mydb.mm_items[mmID]["item"]);
            //Add the compatibilities and conflicts specific to ATLAS into the new item
            const atlasCompatibilities = (typeof this.mydb.mm_items[mmID].mmCompatibilities == "undefined") ? {} : this.mydb.mm_items[mmID].mmCompatibilities;
            const atlasConflicts = (typeof this.mydb.mm_items[mmID].mmConflicts == "undefined") ? [] : this.mydb.mm_items[mmID].mmConflicts;
            for (const modSlotName in atlasCompatibilities) {
                for (const slot of atlasItemOut._props.Slots) {
                    if (slot._name === modSlotName)
                        for (const id of atlasCompatibilities[modSlotName])
                            slot._props.filters[0].Filter.push(id);
                }
            }
            if (!( "ConflictingItems" in atlasItemOut._props))
                atlasItemOut._props.ConflictingItems=[];
            atlasItemOut._props.ConflictingItems = atlasItemOut._props.ConflictingItems.concat(atlasConflicts);
            //Add the new item to the database
            this.db.templates.items[mmID] = atlasItemOut;
            this.logger.debug("Item " + mmID + " created as a clone of " + itemToClone + " and added to database.");
            //Create the handbook entry for the items
            const handbookEntry = {
                "Id": mmID,
                "ParentId": this.mydb.mm_items[mmID]["handbook"]["ParentId"],
                "Price": this.mydb.mm_items[mmID]["handbook"]["Price"]
            };
            //Add the handbook entry to the database
            this.db.templates.handbook.Items.push(handbookEntry);
            this.logger.debug("Item " + mmID + " added to handbook with price " + handbookEntry.Price);
        }
    }
    createItem(itemToCreate) {
        //Create an item from scratch instead of cloning it
        //Requires properly formatted entry in mm_items.json with NO "clone" attribute
        //Get the new item object from the json
        const newItem = this.mydb.mm_items[itemToCreate];
        //If the item is enabled in the json
        if (newItem.enable) {
            //Check the structure of the new item in mm_items
            const [pass, checkedItem] = this.checkItem(newItem);
            if (!pass)
                return;
            //Add the new item to the database
            this.db.templates.items[itemToCreate] = checkedItem;
            this.logger.debug("Item " + itemToCreate + " created and added to database.");
            //Create the handbook entry for the items
            const handbookEntry = {
                "Id": itemToCreate,
                "ParentId": newItem["handbook"]["ParentId"],
                "Price": newItem["handbook"]["Price"]
            };
            //Add the handbook entry to the database
            this.db.templates.handbook.Items.push(handbookEntry);
            this.logger.debug("Item " + itemToCreate + " added to handbook with price " + handbookEntry.Price);
        }
    }
    checkItem(itemToCheck) {
        //A very basic top-level check of an item to make sure it has the proper attributes
        //Also convert to ITemplateItem to avoid errors
        let pass = true;
        //First make sure it has the top-level 5 entries needed for an item
        for (const level1 in itemTemplate) {
            if (!(level1 in itemToCheck.item)) {
                this.logger.error("ERROR - Missing attribute: \"" + level1 + "\" in your item entry!");
                pass = false;
            }
        }
        //Then make sure the attributes in _props exist in the item template, warn user if not.
        for (const prop in itemToCheck.item._props) {
            if (!(prop in itemTemplate._props))
                this.logger.warning("WARNING - Attribute: \"" + prop + "\" not found in item template!");
        }
        const itemOUT = {
            "_id": itemToCheck.item._id,
            "_name": itemToCheck.item._name,
            "_parent": itemToCheck.item._parent,
            "_props": itemToCheck.item._props,
            "_type": itemToCheck.item._type,
            "_proto": itemToCheck.item._proto
        };
        return [pass, itemOUT];
    }
    compareAndReplace(originalItem, attributesToChange) {
        //Recursive function to find attributes in the original item/clothing object and change them.
        //This is done so each attribute does not have to be manually changed and can instead be read from properly formatted json
        //Requires the attributes to be in the same nested object format as the item entry in order to work (see mm_items.json and items.json in SPT install)
        for (const key in attributesToChange) {
            //If you've reached the end of a nested series, try to change the value in original to new
            if (! (key in originalItem)){
                originalItem[key] = attributesToChange[key];
                //continue;
            } else
            if ((["boolean", "string", "number"].includes(typeof attributesToChange[key])) || Array.isArray(attributesToChange[key])) {
                //this.logger.logWithColor("compareAndReplace", "blue");
                //this.logger.logWithColor(originalItem, "yellow");
                //this.logger.logWithColor(attributesToChange, "green");
                if (key in originalItem)
                    originalItem[key] = attributesToChange[key];
                else
                    this.logger.error("There was an error finding the attribute: \"" + key + "\", using default value instead.");
            }
            //Otherwise keep traveling down the nest
            else
                originalItem[key] = this.compareAndReplace(originalItem[key], attributesToChange[key]);
        }
        return originalItem;
    }
    getFilters(item) {
        //Get the slots, chambers, cartridges, and conflicting items objects and return them.
        const slots = (typeof this.db.templates.items[item]._props.Slots === "undefined") ? [] : this.db.templates.items[item]._props.Slots;
        const chambers = (typeof this.db.templates.items[item]._props.Chambers === "undefined") ? [] : this.db.templates.items[item]._props.Chambers;
        const cartridges = (typeof this.db.templates.items[item]._props.Cartridges === "undefined") ? [] : this.db.templates.items[item]._props.Cartridges;
        const filters = slots.concat(chambers, cartridges);
        const conflictingItems = (typeof this.db.templates.items[item]._props.ConflictingItems === "undefined") ? [] : this.db.templates.items[item]._props.ConflictingItems;
        return [filters, conflictingItems];
    }
    copyToFilters(itemClone, mmID) {
        //Find the original item in all compatible and conflict filters and add the clone to those filters as well
        for (const item in this.db.templates.items) {
            if (item in this.mydb.mm_items)
                continue;
            const [filters, conflictingItems] = this.getFilters(item);
            for (const filter of filters) {
                for (const id of filter._props.filters[0].Filter) {
                    if (id === itemClone)
                        filter._props.filters[0].Filter.push(mmID);
                }
            }
            for (const conflictID of conflictingItems)
                if (conflictID === itemClone)
                    conflictingItems.push(mmID);
        }
    }
    addToFilters(mmID) {
        //Add a new item to compatibility & conflict filters of pre-existing items
        const atlasNewItem = this.mydb.mm_items[mmID];
        if ("compatibilities" in atlasNewItem) {
            for (const modSlotName in atlasNewItem.compatibilities) {
                for (const compatibleItem of atlasNewItem.compatibilities[modSlotName]) {
                    const filters = this.getFilters(compatibleItem)[0];
                    for (const filter of filters) {
                        if (modSlotName === filter._name)
                            filter._props.filters[0].Filter.push(mmID);
                    }
                }
            }
        }
        if ("conflicts" in atlasNewItem) {
            for (const conflictingItem of atlasNewItem.conflicts) {
                const conflictingItems = this.getFilters(conflictingItem)[1];
                conflictingItems.push(mmID);
            }
        }
    }
    cloneClothing(itemToClone, mmID) {
        //Get a clone of the original item from the database
        let atlasClothingOut = this.jsonUtil.clone(this.db.templates.customization[itemToClone]);
        //Change the necessary clothing item attributes using the info in our database file atlas_clothes.json
        atlasClothingOut._id = mmID;
        atlasClothingOut._name = mmID;
        atlasClothingOut = this.compareAndReplace(atlasClothingOut, this.mydb.mm_clothes[mmID]["customization"]);
        //Add the new item to the database
        this.db.templates.customization[mmID] = atlasClothingOut;
        this.logger.debug("Clothing item " + mmID + " created as a clone of " + itemToClone + " and added to database.");
    }
    addTraderAssort(trader) {
        //Items
        for (const item in this.mydb.traders[trader].assort.items) {
            //this.logger.info("items " + this.mydb.traders[trader].assort.items[item]._tpl + " added to " + trader);
            this.db.traders[trader].assort.items.push(this.mydb.traders[trader].assort.items[item]);
        }
        //Barter Scheme
        for (const item in this.mydb.traders[trader].assort.barter_scheme) {
            //this.logger.info("barter_scheme " + item + " added to " + trader);
            this.db.traders[trader].assort.barter_scheme[item] = this.mydb.traders[trader].assort.barter_scheme[item];
        }
        //Loyalty Levels
        for (const item in this.mydb.traders[trader].assort.loyal_level_items) {
            //this.logger.info("loyal_level_items " + item + " added to " + trader);
            if (modConfig.lvl1Traders)
                this.db.traders[trader].assort.loyal_level_items[item] = 1;
            else
                this.db.traders[trader].assort.loyal_level_items[item] = this.mydb.traders[trader].assort.loyal_level_items[item];
        }
    }
    addLocales() {
        if (modConfig.oldLocales) //If you are using the old locales
         {
            for (const localeID in this.db.locales.global) {
                if (this.mydb.old_locales.global[localeID]) //If the locale is included in the mod, add it
                 {
                    for (const entry in this.mydb.old_locales.global[localeID].templates)
                        this.db.locales.global[localeID].templates[entry] = this.mydb.old_locales.global[localeID].templates[entry];
                    for (const entry in this.mydb.old_locales.global[localeID].preset)
                        this.db.locales.global[localeID].preset[entry] = this.mydb.old_locales.global[localeID].preset[entry];
                }
                else //Otherwise use the english locale as default
                 {
                    for (const entry in this.mydb.old_locales.global.en.templates)
                        this.db.locales.global[localeID].templates[entry] = this.mydb.old_locales.global.en.templates[entry];
                    for (const entry in this.mydb.old_locales.global.en.preset)
                        this.db.locales.global[localeID].preset[entry] = this.mydb.old_locales.global.en.preset[entry];
                }
            }
        }
        else //Otherwise use the normal locales
         {
            for (const localeID in this.db.locales.global) {
                if (this.mydb.locales.global[localeID]) //If the locale is included in the mod, add it
                 {
                    for (const entry in this.mydb.locales.global[localeID])
                        this.db.locales.global[localeID][entry] = this.mydb.locales.global[localeID][entry];
                }
                else //Otherwise use the english locale as default
                 {
                    for (const entry in this.mydb.locales.global.en)
                        this.db.locales.global[localeID][entry] = this.mydb.locales.global.en[entry];
                }
            }
        }
    }
}
module.exports = { mod: new Lilly() };
