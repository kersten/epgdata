var fs = require("fs"),
    mongoose = require("mongoose"),
    AdmZip = require("adm-zip"),
    xml = require("node-xml"),
    http = require("http"),
    async = require("async"),
    url = require("url");

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

var elementName = {
    "d0": "broadcastId",
    "d1": "tvshowId",
    "d2": "tvchannelId",
    "d3": "tvregionId",
    "d4": "starttime",
    "d5": "endtime",
    "d6": "broadcastDay",
    "d7": "tvshowLength",
    "d8": "vps",
    "d9": "primetime",
    "d10": "categoryId",
    "d11": "technicsBw",
    "d12": "technicsCoChannel",
    "d13": "technicsVt150",
    "d14": "technicsCoded",
    "d15": "technicsBlind",
    "d16": "ageMarker",
    "d17": "liveId",
    "d18": "tipflag",
    "d19": "title",
    "d20": "subtitle",
    "d21": "commentLong",
    "d22": "commentMiddle",
    "d23": "commentShort",
    "d24": "themes",
    "d25": "genreId",
    "d26": "sequence",
    "d27": "technicsStereo",
    "d28": "technicsDolby",
    "d29": "technicsWide",
    "d30": "tvdTotalValue",
    "d31": "attribute",
    "d32": "country",
    "d33": "year",
    "d34": "moderator",
    "d35": "studioGuest",
    "d36": "regisseur",
    "d37": "actor",
    "d38": "imageSmall",
    "d39": "imageMiddle",
    "d40": "imageBig"
};

var countryCode = {
    "A": "Austria",
    "AL": "Albania",
    "AND": "Andorra",
    "ARM": "Armenia",
    "B": "Belgium",
    "BD": "Bangladesh",
    "BG": "Bulgaria",
    "BIH": "Bosnia and Herzegovina",
    "BR": "Brazil",
    "BY": "Belarus",
    "CDN": "Canada",
    "CH": "Switzerland",
    "CY": "Cyprus",
    "CZ": "Czech Republic",
    "D": "Germany",
    "DK": "Denmark",
    "E": "Spain",
    "EE": "Estonia",
    "F": "France",
    "FIN": "Finland",
    "FL": "Liechtenstein",
    "GEO": "Georgia",
    "GR": "Greece",
    "H": "Hungary",
    "HK": "Hong Kong",
    "HR": "Croatia",
    "I": "Italy",
    "IL": "Israel",
    "IR": "Iran",
    "IRL": "Ireland",
    "IS": "Iceland",
    "J": "Japan",
    "L": "Luxembourg",
    "LB": "Libanon",
    "LT": "Lithuania",
    "LV": "Latvia",
    "MC": "Monaco",
    "MD": "Moldova",
    "MK": "Macedonia",
    "MT": "Malta",
    "N": "Norway",
    "NL": "The Netherlands",
    "NZ": "New Zealand",
    "P": "Portugal",
    "PL": "Poland",
    "RN": "Nigeria",
    "RO": "Romania",
    "RSM": "San Marino",
    "RU": "Russia",
    "S": "Sweden",
    "SK": "Slovakia",
    "SLO": "Slovenia",
    "TJ": "China",
    "TR": "Turkey",
    "UA": "Ukraine",
    "UK": "The United Kingdom",
    "USA": "United States of America",
    "YU": "Yugoslavia",
    "ZA": "South Africa"
};

function Epgdata (pin) {
    this.pin = pin;
    this.cache = __dirname +"/../cache";
    this.days = 21;
    this.mongoConnectString = "mongodb://localhost:27017/EpgData";

    this.start();
}

Epgdata.prototype.start = function () {
    var i = 0,
        self = this,
        db = mongoose.connect(this.mongoConnectString);

    mongoose.connection.on('error', function () {
        console.log(arguments);
    });

    this.EpgItem = db.model('EpgItem', this.EpgItemSchema);

    async.whilst(
        function () { return i < self.days; },
        function (callback) {
            i++;

            self.download(i, function () {
                callback();
            });
        },
        function () {
            self.loadData(function () {

            });
        }
    );
};

Epgdata.prototype.EpgItemSchema = new mongoose.Schema({
    "broadcastId"      : Number,
    "tvshowId"         : Number,
    "tvchannelId"      : Number,
    "tvregionId"       : Number,
    "starttime"        : Date,
    "endtime"          : Date,
    "broadcastDay"     : String,
    "tvshowLength"     : String,
    "vps"              : String,
    "primetime"        : String,
    "categoryId"       : String,
    "technicsBw"       : String,
    "technicsCoChannel": String,
    "technicsVt150"    : String,
    "technicsCoded"    : String,
    "technicsBlind"    : String,
    "ageMarker"        : String,
    "liveId"           : String,
    "tipflag"          : String,
    "title"            : String,
    "subtitle"         : String,
    "commentLong"      : String,
    "commentMiddle"    : String,
    "commentShort"     : String,
    "themes"           : String,
    "genreId"          : String,
    "sequence"         : String,
    "technicsStereo"   : String,
    "technicsDolby"    : String,
    "technicsWide"     : String,
    "tvdTotalValue"    : String,
    "attribute"        : String,
    "country"          : [],
    "year"             : String,
    "moderator"        : String,
    "studioGuest"      : String,
    "regisseur"        : String,
    "actor"            : [{
        "name"     : String,
        "character": String
    }],
    "imageSmall"       : Buffer,
    "imageMiddle"      : Buffer,
    "imageBig"         : Buffer
});

Epgdata.prototype.loadData = function (callback) {
    var self = this;

    fs.readdir(this.cache, function (err, files) {
        async.mapSeries(files, function (file, cb) {
            console.log (file);

            if (file.match(/\.zip$/)) {
                self.unpack(self.cache + "/" + file, cb);
            } else {
                cb(null, null);
            }
        }, function (err) {
            console.log("Finished");
            callback();
        });
    });
};

Epgdata.prototype.updateDB = function (entry, cb) {
    var epgItem = new this.EpgItem(entry);

    epgItem.save(function (err) {
        if (err) {
            console.log(err);
            return;
        }

        cb();
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

        console.log("Downloading new file with offset " + offset + "!");

        request = http.request(options, function(response) {
            var writeStream = fs.createWriteStream(self.cache + "/" + fileInformation.filename);

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
            stats = fs.statSync(self.cache + "/" + responseHeaders.filename);

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
        self = this,
        parser; // an array of ZipEntry records

    parser = new xml.SaxParser(function(cb) {
        var element = null,
            data = {};

        cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
            //console.log("=> Started: " + elem + " uri="+uri +" (Attributes: " + JSON.stringify(attrs) + " )");
            if (elem == "data") {
                data = {};
            } else if (elem.match(/^d[0-9]{1,2}$/)) {
                element = elementName[elem] || elem;
            }
        });

        cb.onEndElementNS(function(elem, prefix, uri) {
            element = null;

            if (elem == "data") {
                parser.pause();

                self.updateDB(data, function () {
                    parser.resume();
                });
            }
        });

        cb.onCharacters(function(chars) {
            var value, i, countries, actors, actor;

            if (element == null) {
                return;
            }

            if (element == "starttime" || value == "endtime") {
                value = new Date(chars);
            } else if (element == "country") {
                countries = chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '').toUpperCase().split("|");
                value = [];

                for (i in countries) {
                    value.push(countryCode[countries[i]] || countries[i]);
                }
            } else if (element == "actor") {
                actors = chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '').split(" - ");
                value = [];

                for (i in actors) {
                    actor = /^(.*?).\((.*?)\)$/.exec(actors[i]);

                    value.push({
                        "name": RegExp.$1,
                        "character": RegExp.$2
                    });
                }
            } else if (element == "imageBig" || element == "imageMiddle" || element == "imageSmall") {
                value = fs.readFileSync(self.cache + "/contents/" + chars.replace(/^\s\s*/, '').replace(/\s\s*$/, ''));
            } else {
                value = chars.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
            }

            data[element] = value;
        });
    });

    zip.extractAllTo(this.cache + "/contents", true);

    zipEntries.forEach(function(zipEntry) {
        //console.log(zipEntry.toString()); // outputs zip entries information
        if (zipEntry.entryName.match(/\.xml$/)) {
            parser.parseString(zip.readAsText(zipEntry.entryName));

            fs.rmdirSync(self.cache + "/contents");
            callback(null, null);
        }
    });
};

module.exports = Epgdata;