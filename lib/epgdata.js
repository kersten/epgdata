var fs = require("fs"),
    mongoose = require("mongoose"),
    AdmZip = require("adm-zip"),
    xml = require("node-xml"),
    http = require("http"),
    async = require("async"),
    url = require("url");

function Epgdata (pin) {
    this.pin = pin;
    this.cache = __dirname +"/../cache/";
    this.days = 21;

    this.start();
}

Epgdata.prototype.start = function () {
    var i = 0,
        self = this;

    async.whilst(
        function () { return i < self.days; },
        function (callback) {
            i++;

            self.download(i, function () {
                callback();
            });
        },
        function () {
            self.loadData();
        }
    );
};

Epgdata.prototype.loadData = function () {
    var self = this;

    fs.readdir(this.cache, function (err, files) {
        async.mapSeries(files, function (file, cb) {
            console.log (file);

            if (file.match(/\.zip$/)) {
                self.unpack(self.cache + file, cb);
            } else {
                cb(null);
            }
        }, function (err) {
            callback("Finished")
        });
    });
};

Epgdata.prototype.download = function (offset, cb) {
    var self = this;

    this.checkHeader(offset, function (fileInformation, options) {
        var request;

        if (fileInformation === false) {
            console.log("File with offset " + offset + " not found!");
            cb();
            return;
        }

        if (options === false) {
            cb();
            return;
        }

        options.method = "GET";

        request = http.request(options, function(response) {
            var writeStream = fs.createWriteStream(self.cache + fileInformation.filename);

            response.pipe(writeStream);

            response.on("end", function () {
                cb();
            });

            response.on("error", function () {
                console.log(arguments);
            });
        });

        request.end();
    });
};

Epgdata.prototype.checkHeader = function (offset, cb) {
    var self = this;

    var siteUrl = url.parse("http://www.epgdata.com/index.php?action=sendPackage&iOEM=vdr&pin=" + this.pin + "&dayOffset=" + offset + "&dataType=xml"),
        options = {
            host: siteUrl.host,
            port: 80,
            path: siteUrl.path,
            method: "HEAD"
        }, request;

    request = http.request(options, function(response) {
        var responseHeaders = {},
            stats, e,
            header;

        response.setEncoding("utf8");

        if (response.headers["content-disposition"] === undefined) {
            cb(false);
            return;
        }

        responseHeaders.filename = response.headers["content-disposition"].split("filename=")[1];

        try {
            stats = fs.statSync(self.cache + responseHeaders.filename);

            if  (stats.isFile() && stats.size == response.headers["content-length"]) {
                cb(responseHeaders, false);
                return;
            }
        } catch (e) {

        }

        for (header in response.headers) {
            if (header.match(/x-epgdata-/)) {
                responseHeaders[header] = response.headers[header];
            }
        };

        response.on("end", function () {
            cb(responseHeaders, options);
        });
    });

    request.end();
};

Epgdata.prototype.unpack = function (file, callback) {
    var zip = new AdmZip(file),
        zipEntries = zip.getEntries(),
        entries = [],
        parser; // an array of ZipEntry records

    parser = new xml.SaxParser(function(cb) {
        var element = null,
            data = {};

        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
            //console.log("=> Started: " + elem + " uri="+uri +" (Attributes: " + JSON.stringify(attrs) + " )");
            if (elem == "data") {
                data = {};
            } else if (elem.match(/^d[0-9]{1,2}$/)) {
                element = elem;
            }
        });

        /*
         <!ELEMENT d0 (#PCDATA)>    <!-- broadcast_id -->
         <!ELEMENT d1 (#PCDATA)>    <!-- tvshow_id -->
         <!ELEMENT d2 (#PCDATA)>    <!-- tvchannel_id -->
         <!ELEMENT d3 (#PCDATA)>    <!-- tvregionid -->
         <!ELEMENT d4 (#PCDATA)>    <!-- starttime -->
         <!ELEMENT d5 (#PCDATA)>    <!-- endtime -->
         <!ELEMENT d6 (#PCDATA)>    <!-- broadcast_day -->
         <!ELEMENT d7 (#PCDATA)>    <!-- tvshow_length -->
         <!ELEMENT d8 (#PCDATA)>    <!-- vps -->
         <!ELEMENT d9 (#PCDATA)>    <!-- primetime -->
         <!ELEMENT d10 (#PCDATA)>    <!-- category_id -->
         <!ELEMENT d11 (#PCDATA)>    <!-- technics_bw -->
         <!ELEMENT d12 (#PCDATA)>    <!-- technics_co_channel -->
         <!ELEMENT d13 (#PCDATA)>    <!-- technics_vt150 -->
         <!ELEMENT d14 (#PCDATA)>    <!-- technics_coded -->
         <!ELEMENT d15 (#PCDATA)>    <!-- technics_blind -->
         <!ELEMENT d16 (#PCDATA)>    <!-- age_marker -->
         <!ELEMENT d17 (#PCDATA)>    <!-- live_id -->
         <!ELEMENT d18 (#PCDATA)>    <!-- tipflag -->
         <!ELEMENT d19 (#PCDATA)>    <!-- title -->
         <!ELEMENT d20 (#PCDATA)>    <!-- subtitle -->
         <!ELEMENT d21 (#PCDATA)>    <!-- comment_long -->
         <!ELEMENT d22 (#PCDATA)>    <!-- comment_middle -->
         <!ELEMENT d23 (#PCDATA)>    <!-- comment_short -->
         <!ELEMENT d24 (#PCDATA)>    <!-- themes -->
         <!ELEMENT d25 (#PCDATA)>    <!-- genreid -->
         <!ELEMENT d26 (#PCDATA)>    <!-- sequence -->
         <!ELEMENT d27 (#PCDATA)>    <!-- technics_stereo -->
         <!ELEMENT d28 (#PCDATA)>    <!-- technics_dolby -->
         <!ELEMENT d29 (#PCDATA)>    <!-- technics_wide -->
         <!ELEMENT d30 (#PCDATA)>    <!-- tvd_total_value -->
         <!ELEMENT d31 (#PCDATA)>    <!-- attribute -->
         <!ELEMENT d32 (#PCDATA)>    <!-- country -->
         <!ELEMENT d33 (#PCDATA)>    <!-- year -->
         <!ELEMENT d34 (#PCDATA)>    <!-- moderator -->
         <!ELEMENT d35 (#PCDATA)>    <!-- studio_guest -->
         <!ELEMENT d36 (#PCDATA)>    <!-- regisseur -->
         <!ELEMENT d37 (#PCDATA)>    <!-- actor -->
         <!ELEMENT d38 (#PCDATA)>    <!-- image_small -->
         <!ELEMENT d39 (#PCDATA)>    <!-- image_middle -->
         <!ELEMENT d40 (#PCDATA)>    <!-- image_big -->
         */

        cb.onEndElementNS(function(elem, prefix, uri) {
            if (elem == "data") {
                entries.push(data);
            }
        });

        cb.onCharacters(function(chars) {
            console.log(chars);
            data[element] = chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        });

        cb.onCdata(function(cdata) {
            //console.log("<CDATA>"+cdata+"</CDATA>");
        });
    });

    zipEntries.forEach(function(zipEntry) {
        //console.log(zipEntry.toString()); // outputs zip entries information
        if (zipEntry.entryName.match(/\.xml$/)) {
            parser.parseString(zip.readAsText(zipEntry.entryName));

            console.log(entries);

            callback(null, null);
        }
    });
};

module.exports = Epgdata;