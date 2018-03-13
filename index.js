
var bytes = require('bytes');
var mkdirp = require('mkdirp');
var fs = require('fs');
var getDirName = require('path').dirname;
const syncClient = require('sync-rest-client');
var parse5 = require('parse5');
const walk = require('walk-parse5');

var gigabyte_menu_endpoint ='https://www.gigabyte.com/Ajax/SupportFunction/GetLevelInfo'//  --data 'classKey=2&level=1&selectVal=0' 
var gigabyte_product_endpoint = 'https://www.gigabyte.com/Ajax/Product/GetModelInfoByAjax';// --data 'modelUrl=GA-AX370-Gaming&contentType=support'

var download_folder = "download";

var downloadSize = 0;
var download_file = "download_list.sh";

function main(){
    //fs.writeFileSync(download_file,"#!/bin/bash\n");

    downloadClass(2);
    //downloadClass(5); //TODO debug laptops
    
}

function downloadClass(cKey){
    var args = {
        payload: {
            classKey:cKey,
            level:1,
            selectVal:0 
        }
    }

    var json = request(gigabyte_menu_endpoint, args);
    var parsedContent = parseAllLevel1(json.body, cKey);
}

function request(endpoint, args, cb){
    //  console.log(endpoint + " : " + JSON.stringify(args));

    var data = syncClient.post(endpoint, args);
    return data;
}

function writeFile(path, contents) {
    mkdirp(getDirName(path), function (err) {
      if (err) return cb(err);
  
      fs.writeFile(path, contents);
    });
}
  
function parseAllLevel1(json, cKey){
    json.forEach(entry => {
        var args = {
            payload: {
                classKey: cKey,
                level: 2,
                selectVal: entry.Value
            }
        }
        var json = request(gigabyte_menu_endpoint, args);
        parseAllLevel2(json.body, cKey);
    });
}

function parseAllLevel2(data, cKey){
    var json = data;
    json.forEach(entry => {
        var args = {
            payload: 
            {
                classKey: cKey,
                level: 99,
                selectVal: entry.Value
            }
        }
        var json = request(gigabyte_menu_endpoint, args);
        parseAllLevel3(json.body);
    });
}      

function parseAllLevel3(data){
    var json = data;
    json.forEach(entry => {
        var mainboard_name = entry.MainInfo.url_parame_name.replace("/Motherboard/","");

        var args = {
            payload: 
            {
                modelUrl:mainboard_name,
                contentType: "support"
            },
        }
        var html = request(gigabyte_product_endpoint, args);
        getMainboardSite(html.body);
    });
}      

function getMainboardSite(data){
    var document = parse5.parseFragment(data);
    walk(document, function(node) {
        if(node.parentNode != undefined){
            delete node.parentNode;
        }
        if(node.namespaceURI != undefined){
            delete node.namespaceURI;
        }
        if(node.childNodes != undefined && node.childNodes.length == 0){
            delete node.childNodes;
        }
        
    });

    walk(document, function(node) {
            

                    if(node.nodeName== 'ul' && node.tagName== 'ul'){
                    var attrs = node.attrs;
                    // search for <ul class="detail-ul" id="BIOSHide">
                    var target = [
                        {
                            "name": "class",
                            "value": "detail-ul"
                        },
                        {
                            "name": "id",
                            "value": "BIOSHide"
                        }
                    ];
                    // let it buuuuuuurn
                    if(isEqual(attrs, target)){
                        walk(node, function(node) {
                            if(node.nodeName== 'a' && node.tagName== 'a'){
                                var region = node.childNodes[0].value.trim();
                                var attrs = node.attrs;
                                attrs.forEach(elem=>{
                                    if(elem.name == "href"){
                                        var json = {};
                                        json.region = region;
                                        json.url = elem.value;
                                        //console.log(json.region+" : "+json.url);
                                        console.log(JSON.stringify(json));
                                    }
                                });
                               
                            }
                        });
                    }
                }
            });
            console.log("__________");
}

var isEqual = function (value, other) {

	// Get the value type
	var type = Object.prototype.toString.call(value);

	// If the two objects are not the same type, return false
	if (type !== Object.prototype.toString.call(other)) return false;

	// If items are not an object or array, return false
	if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

	// Compare the length of the length of the two items
	var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
	var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
	if (valueLen !== otherLen) return false;

	// Compare two items
	var compare = function (item1, item2) {

		// Get the object type
		var itemType = Object.prototype.toString.call(item1);

		// If an object or array, compare recursively
		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
			if (!isEqual(item1, item2)) return false;
		}

		// Otherwise, do a simple comparison
		else {

			// If the two items are not the same type, return false
			if (itemType !== Object.prototype.toString.call(item2)) return false;

			// Else if it's a function, convert to a string and compare
			// Otherwise, just compare
			if (itemType === '[object Function]') {
				if (item1.toString() !== item2.toString()) return false;
			} else {
				if (item1 !== item2) return false;
			}

		}
	};

	// Compare properties
	if (type === '[object Array]') {
		for (var i = 0; i < valueLen; i++) {
			if (compare(value[i], other[i]) === false) return false;
		}
	} else {
		for (var key in value) {
			if (value.hasOwnProperty(key)) {
				if (compare(value[key], other[key]) === false) return false;
			}
		}
	}

	// If nothing failed, return true
	return true;

};

main();