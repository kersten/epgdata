var fs = require('fs'),
    mongoose = require("mongoose"),
    AdmZip = require('adm-zip'),
    xml = require("node-xml");

function Epgdata () {

}

Epgdata.prototype.unpack = function (file) {
    var zip = new AdmZip(file),
        zipEntries = zip.getEntries(); // an array of ZipEntry records

    zipEntries.forEach(function(zipEntry) {
        //console.log(zipEntry.toString()); // outputs zip entries information
        if (zipEntry.entryName == "20120924_201209241453_de_qy.xml") {
            //console.log(zipEntry.toString());
        }
    });

    //console.log(zip.readAsText("20120924_201209241453_de_qy.xml"));

    var parser = new xml.SaxParser(function(cb) {
        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
            console.log("=> Started: " + elem + " uri="+uri +" (Attributes: " + JSON.stringify(attrs) + " )");
        });

        cb.onEndElementNS(function(elem, prefix, uri) {
            console.log("<= End: " + elem + " uri="+uri + "\n");
            parser.pause();// pause the parser
            setTimeout(function (){parser.resume();}, 200); //resume the parser
        });

        cb.onCharacters(function(chars) {
            console.log(chars);
        });

        cb.onCdata(function(cdata) {
            console.log('<CDATA>'+cdata+"</CDATA>");
        });
    });

    parser.parseString(zip.readAsText("20120924_201209241453_de_qy.xml"));
};

module.exports = Epgdata;