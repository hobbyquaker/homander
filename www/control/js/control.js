var currentAdapterSettings;
var mainSettings  = null;

/*
var cAdapterMask  = 0xFFF;
var cAdapterShift = 20; // Bits
var cObjectsMask  = 0xFFFFF;

var cAdapterId    = 0;
var cObjectId     = 1;
var cCombyId      = 2;

var cUserAdapter  = 3;
*/

var availAdapters = [];

function updateAdapterSettings() {
    $("#adapter_config_json").html(JSON.stringify(currentAdapterSettings, null, "    "));
}

function translateWord(text, lang, dictionary) {
    if (!mainSettings) return text;
    if (!dictionary) dictionary = ccuWords;
    if (!lang)       lang       = mainSettings.language || 'en';

    if (!dictionary) {
        return text;
    }

    if (dictionary[text]) {
        var newText = dictionary[text][lang];
        if (newText){
            return newText;
        }
        else if (lang != 'en') {
            newText = dictionary[text]['en'];
            if (newText){
                return newText;
            }
        }

    }
    return text;
}

function translateWordBack(text, lang, dictionary) {
    if (!dictionary) {
        return text;
    }
    for (var word in dictionary) {
        if (dictionary[word] === null)
            continue;
        if (dictionary[word][lang] == text)
            return word;
    }

    console.log("back: " + text);
    return text;
}

function translateAll(lang, dictionary) {
    lang  = lang || mainSettings.language || 'en';
    dictionary = dictionary || ccuWords;

    $(".translate").each(function (idx) {
        var curlang = $(this).attr('data-lang');
        var text    = $(this).html();
        if (curlang != lang) {
            if (curlang) {
                text = translateWordBack(text, curlang, dictionary);
            }

            var transText = translateWord(text, lang, dictionary);
            if (transText) {
                $(this).html(transText);
                $(this).attr('data-lang', lang);
            }
        }
    });
    // translate <input type="button>
    $(".translateV").each(function (idx) {
        var text    = $( this ).attr('value');
        var curlang = $(this).attr('data-lang');
        if (curlang != lang) {
            if (curlang) {
                text = translateWordBack(text, curlang, dictionary);
            }

            var transText = translateWord(text, lang, dictionary);
            if (transText) {
                $(this).attr('value', transText);
                $(this).attr('data-lang', lang);
            }
        }
    });
    $(".translateB").each(function (idx) {
        //<span class="ui-button-text">Save</span>
        var text    = $( this ).html();
        text = text.replace('<span class="ui-button-text">', "").replace("</span>", "");
        var curlang = $(this).attr('data-lang');
        if (curlang != lang) {
            if (curlang) {
                text = translateWordBack(text, curlang, dictionary);
            }

            var transText = translateWord(text, lang, dictionary);
            if (transText) {
                $(this).html('<span class="ui-button-text">' + transText + '</span>');
                $(this).attr('data-lang', lang);
            }
        }
    });
}

$(document).ready(function () {
    var installedAddons = [];

    var dataObjects,
        dataIndex;

    /*
    TODO: event statistics

    var lastRegaPoll,
        lastRfEvent,
        lastHs485Event,
        lastCuxEvent;

    setInterval(function () {
        if (lastRegaPoll !== undefined) {
            lastRegaPoll += 1;
            $(".homander-lastrega").html(formatLastEvent(lastRegaPoll));
        }
        if (lastRfEvent !== undefined) {
            lastRfEvent += 1;
            $(".homander-lastrf").html(formatLastEvent(lastRfEvent));
        }
        if (lastHs485Event !== undefined) {
            lastHs485Event += 1;
            $(".homander-lasths485").html(formatLastEvent(lastHs485Event));
        }
        if (lastCuxEvent !== undefined) {
            lastCuxEvent += 1;
            $(".homander-lastcux").html(formatLastEvent(lastCuxEvent));
        }
    }, 1000);


    function formatLastEvent(sec) {
        if (sec > 3599) {
            var hours = Math.floor(sec / 3600);
            var rest = sec - (hours * 3600);
            var minutes = Math.floor(rest / 60);
            rest = rest - (minutes * 60);
            return hours+"h "+("0"+minutes).slice(-2)+"m "+("0"+rest).slice(-2)+"s";
        } else if (sec > 59) {
            var minutes = Math.floor(sec / 60);
            var rest = sec - (minutes * 60);
            return "0h "+("0"+minutes).slice(-2)+"m "+("0"+rest).slice(-2)+"s";
        } else {
            return "0h 00m "+("0"+sec).slice(-2)+"s";
        }

    }*/

    function updateAddonHandler(id) {
        $("input#"+id).click(function () {

            var $this = $(this);
            $this.attr("disabled", true);
            var url = $this.attr("data-update-url");
            var name = $this.attr("data-update-name");
            var id = $this.attr("id");

            socket.emit("getUrl", url, function(res) {
                try {
                    var obj = JSON.parse(res);
                    $("input.updateCheck[data-update-name='"+obj.name+"']").parent().append(obj.version);

                    var instVersion = $("input.updateCheck[data-update-name='"+obj.name+"']").parent().parent().find("td[aria-describedby='grid_addons_installedVersion']").html();
                    instVersion = instVersion.replace(/beta/,".");

                    var availVersion = obj.version;
                    availVersion = availVersion.replace(/beta/,".");

                    var updateAvailable = compareVersion(instVersion, availVersion);

                    if (updateAvailable) {
                        $("input.updateCheck[data-update-name='"+obj.name+"']").parent().prepend("<input type='button' id='update_"+obj.ident+"' class='addon-update translateV' data-lang='"+((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+"' value='"+translateWord("update")+"'/>&nbsp;");
                        $("input#update_"+obj.ident).click(function () {
                            $(this).attr("disabled", true);
                            var that = this;
                            socket.emit("updateAddon", obj.urlDownload, obj.dirname, function (err) {
                                if (err) {
                                    showMessage(err);
                                } else {
                                    $(that).remove();
                                }
                            });

                        });
                    }
                    $("input.updateCheck[data-update-name='"+obj.name+"']").hide();
                } catch (e) {
                    url = url.replace(/[^\/]+\/io-addon.json/,"io-addon.json");
                    socket.emit("getUrl", url, function(res) {
                        obj = JSON.parse(res);
                        $("input.updateCheck[data-update-name='"+obj.name+"']").parent().append(obj.version);

                        var instVersion = $("input.updateCheck[data-update-name='"+obj.name+"']").parent().parent().find("td[aria-describedby='grid_addons_installedVersion']").html();
                        instVersion = instVersion.replace(/beta/,".");

                        var availVersion = obj.version;
                        availVersion = availVersion.replace(/beta/,".");

                        var updateAvailable = compareVersion(instVersion, availVersion);

                        if (updateAvailable) {
                            $("input.updateCheck[data-update-name='"+obj.name+"']").parent().prepend("<input type='button' id='update_"+obj.ident+"' class='addon-update' data-lang='"+((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+"' value='"+translateWord("update")+"'/>&nbsp;");
                            $("input#update_"+obj.ident).click(function () {
                                $(this).attr("disabled", true);
                                var that = this;
                                socket.emit("updateAddon", obj.urlDownload, obj.dirname, function (err) {
                                    if (err) {
                                        showMessage(err);
                                    } else {
                                        $(that).remove();
                                    }
                                });

                            });
                        }
                        $("input.updateCheck[data-update-name='"+obj.name+"']").hide();
                    });
                }

            });
        });
    }

    function compareVersion(instVersion, availVersion) {
        var instVersionArr = instVersion.replace(/beta/,".").split(".");
        var availVersionArr = availVersion.replace(/beta/,".").split(".");

        var updateAvailable = false;

        for (var k = 0; k<3; k++) {
            instVersionArr[k] = parseInt(instVersionArr[k], 10);
            if (isNaN(instVersionArr[k])) { instVersionArr[k] = -1; }
            availVersionArr[k] = parseInt(availVersionArr[k], 10);
            if (isNaN(availVersionArr[k])) { availVersionArr[k] = -1; }
        }

        if (availVersionArr[0] > instVersionArr[0]) {
            updateAvailable = true;
        } else if (availVersionArr[0] == instVersionArr[0]) {
            if (availVersionArr[1] > instVersionArr[1]) {
                updateAvailable = true;
            } else if (availVersionArr[1] == instVersionArr[1]) {
                if (availVersionArr[2] > instVersionArr[2]) {
                    updateAvailable = true;
                }
            }
        }
        return updateAvailable;
    }

    $(".jqui-tabs").tabs();

    var eventCounter = 0;
    var $mainTabs = $("#mainTabs");
    var $subTabs5 = $("#subTabs5");

    $mainTabs.tabs({
        activate: function (e, ui) {
            resizeGrids();
        }
    });

    var $datapointGrid = $('#grid_datapoints');
    var $eventGrid = $('#grid_events');

    $("#loader_message").append(translateWord('connecting to Homander') +  '... <br/>');

    var socket = io.connect( $(location).attr('protocol') + '//' +  $(location).attr('host') + "?key="+socketSession);

    $("#loader_message").append(translateWord("loading stringtable") + " ... <br/>");

    socket.emit('getStringtable', function(obj) {
        $("#stringtable").html(JSON.stringify(obj, null, "  "));
    });

    function getYesNo (isTrue, isWarning) {
        return isTrue ? "<span class='indicator-true translate' data-lang='"+(mainSettings.language || 'en')+"'>"+translateWord("YES")+"</span>"  : "<span class='" + (!isWarning ? "indicator-false" :"indicator-false-warning")+" translate' data-lang='"+(mainSettings.language || 'en')+"'>"+translateWord("NO")+"</span>";
    }
    function getTrueFalse (isTrue) {
        return isTrue ? "<span style='color:green'><b data-lang='"+(mainSettings.language || 'en')+"' class='translate'>"+translateWord('TRUE')+"</b></span>" : "<span data-lang='"+(mainSettings.language || 'en')+"' class='translate'>"+translateWord('false')+"</span>";
    }
    $("#loader_message").append(translateWord("loading settings") + " ... <br/>");

    socket.emit("getSettings", function (settings) {
        mainSettings = settings;
        $(".homander-version").html(settings.version);
        $(".homander-scriptengine").html(getYesNo(settings.scriptEngineEnabled));
        $(".homander-adapters").html(getYesNo(settings.adaptersEnabled));
        $(".homander-logging").html(getYesNo(settings.logging.enabled));

        loadSettings();
        translateAll();

        $("#install_addon_dialog").dialog({
            autoOpen: false,
            title: translateWord ("Install Addon"),
            modal: true
        });
        $("#loader_message").append("<span id='loader_adapter'>"+translateWord("loading adapters") + " </span><br/>");

        socket.emit("readdir", ["adapter"], function (data) {
            for (var i = data.length - 1; i >= 0; i--) {
                var adapter = data[i];
                if (!adapter || adapter.match(/^skeleton/) || adapter == ".DS_Store") {
                    data.slice (i, 1);
                }
            }

            var iCountAdapter = data.length;
            for (var i = 0; i < data.length; i++) {
                var adapter = data[i];
                socket.emit("readJsonFile", ["adapter/"+adapter+"/settings.json"], function (_data) {
                    iCountAdapter--;
                    if (!_data) return;

                    availAdapters[_data.name] = _data;
                    $("#loader_adapter").append(".");
                    var isCanBeAdded = true;
                    if (_data.isUnique === undefined) {
                        _data.isUnique = true;
                    }
                    if (_data.isUnique) {
                        for (var ii = cUserAdapter; ii < mainSettings.adapters.length; ii++) {
                            if (!mainSettings.adapters[ii]) continue;
                            if (mainSettings.adapters[ii].name == _data.name) {
                                isCanBeAdded = false;
                                break;
                            }
                        }
                    }
                    if (isCanBeAdded) {
                        if (!_data.name) {
                            console.log ("No name found for adapter");
                        }
                        else {
                            $("#avail_adapters").append($("<option></option>")
                                .attr("value", _data.name)
                                .text(_data.name + " - " + _data.description));
                        }
                    }
                    if (!iCountAdapter) {
                        for (var adapterId = cUserAdapter, len = mainSettings.adapters.length; adapterId < len; adapterId++){
                            if (mainSettings.adapters[adapterId]) {
                                var name = mainSettings.adapters[adapterId].name.replace ("_"+adapterId, "");
                                var adapterData = oneAdapterLine (adapterId);
                                $("#grid_adapter").jqGrid("addRowData", adapterId, adapterData);
                            }
                        }
                        $(".adapter-settings").click(function () {
                            editAdapterSettings($(this).attr("data-adapter"));
                        });
                        $(".adapter-restart").click(function () {
                            restartAdapter($(this).attr("data-adapter"));
                        });
                        $(".adapter-delete").click(function () {
                            deleteAdapter ($(this).attr("data-adapter"));
                        });

                    }
                });
            }
        });
    });
    $("#loader_message").append(translateWord("loading status") + " ... <br/>");

    socket.emit("getStatus", function (data) {
        var table = "<table style='font-size:12px'>";
        for (var obj in data){
            table += "<tr><td>" + obj + "</td><td>" + getYesNo(data[obj], true)  + "</td></tr>";
        }
        table += "</table>";
        $(".comby-status").html(table);
    });

    socket.on("updateStatus", function (data) {
        var table = "<table style='font-size:12px'>";
        for (var obj in data){
            table += "<tr><td>" + obj + "</td><td>" + getYesNo(data[obj], true)  + "</td></tr>";
        }
        table += "</table>";
        $(".comby-status").html(table);
    });

    socket.on ("readyBackup", function (name) {
        showMessage ();
        $('#createBackup').button( "option", "disabled", false);
        $('#createBackupWithLog').button( "option", "disabled", false);
        location.replace(name);
    });
    socket.on ("applyReady", function (text) {
        $('#applyBackup').button( "option", "disabled", false);
        showMessage ();
        showMessage (text);
    });
    socket.on ("applyError", function (text) {
        $('#applyBackup').button( "option", "disabled", false);
        showMessage ();
        showMessage (text, "Error");
    });
    socket.on("ioMessage", function (data) {
        showMessage (data);
    });

    $("#loader_message").append("<span id='loader_addons'>"+translateWord("loading addons") + " </span><br/>");

    socket.emit("readdir", ["www"], function (data) {

        for (var i = 0; i < data.length; i++) {
            var addon = data[i];
            if (addon == "lib" || addon == "Homander" || addon == "index.html") { continue; }

            socket.emit("readJsonFile", "www/"+addon+"/io-addon.json", function(meta) {
                if (meta) {
                    var hp = meta.urlHomepage.match(/[http|https]:\/\/(.*)/);
                    var dl = meta.urlDownload.match(/\/([^/]+)$/);

                    var addonData = {
                        name:               "<a href='/"+meta.dirname+"' target='_blank'>"+meta.name+"</a>",
                        installedVersion:   meta.version,
                        availableVersion:   "<input id='update_addon_"+meta.name+"'data-update-name='"+meta.name+"' class='updateCheck translateV' data-update-url='"+meta.urlMeta+"' type='button' data-lang='"+((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+"' value='"+translateWord("check")+"'/>",
                        homepage:           "<a href='"+meta.urlHomepage+"' target='_blank'>"+hp[1]+"</a>",
                        download:           "<a href='"+meta.urlDownload+"' target='_blank'>"+dl[1]+"</a>"
                    };
                    $("#grid_addons").jqGrid('addRowData', i, addonData);
                    $("#loader_addons").append(".");

                    updateAddonHandler("update_addon_"+meta.name);


                    installedAddons.push(meta.dirname+"="+meta.version);
                    $("#install_addon_select option[value='"+meta.dirname+"']").remove();

                }
            });
        }

        $("input#update_self_check").click(function () {
            $("#update_self_check").attr("disabled", true);
            var url = "http://Homander/version.php";
            socket.emit("getUrl", url, function(res) {
                $("#update_self_check").hide();
                $(".homander-availversion").html(res);
                if (compareVersion(mainSettings.version, res)) {
                    $("#update_self").show().click(function () {
                        socket.emit("updateSelf");
                    });
                }
            });
        });
    });

    $("#loader_message").append(translateWord("loading datastore") + " ... <br/>");

    socket.emit("readdir", ["datastore"], function (data) {
        for (var i = 0; i < data.length; i++) {
            //if (data[i] == ".gitignore") { continue; }
            $("select#select_datastore").append('<option value="'+data[i]+'">'+data[i]+'</option>');
        }
        $("#select_datastore").multiselect({
            multiple: false,
            header: false,
            selectedList: 1
        }).change(function () {
                var file = $("#select_datastore option:selected").val();
                if (file == "") {
                    $("textarea#datastore").val("");
                    $("#datastoreSave").button("disable");
                } else {

                    $("textarea#datastore").val("");
                    $("#datastoreSave").button("disable");

                    socket.emit("readFile", [file], function (data) {
                        if (data) {
                            $("textarea#datastore").val(JSON.stringify(data, null, 2));
                            $("#datastoreSave").button("enable");
                        }
                    });
                }
            });
    });

    $("#datastoreSave").button().button("disable").click(function () {
        var file = $("#select_datastore option:selected").val();
        try {
            var data = JSON.parse($("textarea#datastore").val());

            socket.emit("writeFile", file, data, function (res) {
                //if (res) {
                showMessage ("File saved.");
                //} else {
                //    alert("Error: can't save file");
                //}
            });

        } catch (e) {
            showMessage ("Error: "+e);

        }
    });

    socket.on('reloadDataReady', function() {
        window.location.reload();
    });

    socket.on('disconnect', function() {
        setTimeout(function () {
            showMessage("Homander disconnected");
            setInterval(function () {
                //console.log("trying to force reconnect...");
                $.ajax({
                    url: "/Homander/index.html",
                    success: function () {
                        window.location.reload();
                    }
                });
            }, 90000);
        }, 100);

    });


    socket.on('reconnect', function() {
        window.location.reload();
    });


    $("#restartAll").button().css("width", 300).click(function () {
        socket.emit("restart");
        $("#restarting").show();
        setTimeout(function () {
            window.location.reload();
        }, 30000);
    });

    $("#refreshAddons").button().css("width", 300).click(function () {
        socket.emit("refreshAddons");
    })

    $("#refreshObjects").button().css("width", 300).click(function () {
        socket.emit('reloadData');
    });
    $("#createBackup").button().css("width", 300).click(function () {
        $(this).button( "option", "disabled", true );
        $('#createBackupWithLog').button( "option", "disabled", true );
        socket.emit('createBackup');
    });
    $("#createBackupWithLog").button().css("width", 300).click(function () {
        $(this).button( "option", "disabled", true );
        $("#createBackup").button( "option", "disabled", true );
        socket.emit('createBackup', true);
    });

    $("#applyBackup").button().css("width", 300).click(function () {
        $("#applyBackup").button( "option", "disabled", true );
    });

    $("#applyBackup").dropzone({
        url: "/upload?path=./www/_",
        acceptedFiles: "application/x-gzip",
        uploadMultiple: false,
        previewTemplate: '<div class="dz-preview dz-file-preview"><div class="dz-details"><div class="dz-filename"><span data-dz-name></span></div><br/>' +
            '<div class="dz-size" data-dz-size></div><br/><img data-dz-thumbnail /></div><div class="dz-progress"><span class="dz-upload" data-dz-uploadprogress></span></div>' +
            '<div class="dz-error-message"><span data-dz-errormessage></span></div></div>',
        previewsContainer: "#uploadPreview",
        clickable: true,
        dragover: function (e) {
            var el = $(e.toElement);
            $(e.toElement).closest("li.ui-li").addClass("upload-start");
        },
        dragleave: function (e) {
            $(e.toElement).closest("li.ui-li").removeClass("upload-start");
        },
        drop: function (e, ui) {
            var closest = $(e.toElement).closest("li.ui-li");
            closest.removeClass("upload-start");

        },
        complete: function (e) {
            socket.emit('applyBackup', "_" + e.name);
        },
        init: function () {
            this.on("processing", function() {
                this.options.url = "/upload?path=./www/_";
            });
        }

    });

    $("#restartAddons").button().css("width", 300).click(function () {
        socket.emit('restartAddons');
    });

    $("#reloadScriptEngine").button().css("width", 300).click(function () {
        $("#reloadScriptEngine").button("disable");
        socket.emit('reloadScriptEngine', function () {
            $("#reloadScriptEngine").button("enable");
        });
    });

    $("#dataRefresh").button().css("width", 300).click(function() {
        $("#data").html("");
        socket.emit('getDatapoints', function(obj) {
            $("#data").html(JSON.stringify(obj, null, "  "));
        });

    });

    $("#dataSave").button();

    $("#metaRefresh").button().click(function() {
        $("#meta").html("");
        socket.emit('getObjects', function(obj) {
            $("#meta").html(JSON.stringify(obj, null, "  "));
            dataObjects = obj;
        });
    });

    $("#metaSave").button();
    $("#metaAnonymize").button().click(function () {
        var anon = {};
        for (var id in dataObjects) {
            anon[id] = dataObjects[id];
            anon[id].Name = dataObjects[id].Name.replace(/[A-Z]EQ[0-9]{7}/, "*EQ*******");
            if (anon[id].Address) {
                anon[id].Address = dataObjects[id].Address.replace(/[A-Z]EQ[0-9]{7}/, "*EQ*******");
            }
        }
        $("#meta").html(JSON.stringify(anon, null, "  "));
    });


    $("#indexRefresh").button().click(function() {
        $("#index").html("");
        socket.emit('getIndex', function(obj) {
            dataIndex = obj;
            $("#index").html(JSON.stringify(obj, null, "  "));
        });
    });

    $("#indexSave").button();
    $("#indexAnonymize").button().click(function () {
        var anon = {};
        for (var group in dataIndex) {
            anon[group] = {};
            for (var key in dataIndex[group]) {
                if (key.match(/[A-Z]EQ[0-9]{7}/)) {
                    console.log(key);
                    anon[group][key.replace(/[A-Z]EQ[0-9]{7}/, "*EQ*******")] = dataIndex[group][key];
                } else {
                    anon[group][key] = dataIndex[group][key];
                }
            }
        }
        $("#index").html(JSON.stringify(anon, null, "  "));
    });








    /*
     $("#grid_log").jqGrid({
     colNames:['Timestamp','Severity', 'Message'],
     colModel:[
     {name:'timestamp',index:'timestamp', width:100},
     {name:'severity',index:'severity', width:100},
     {name:'message',index:'message', width:800}
     ],
     rowNum:10,
     autowidth: true,
     width: "100%",
     rowList:[10,20,30],
     //pager: $('#pager_log'),
     sortname: 'timestamp',
     viewrecords: true,
     sortorder: "desc",
     caption:"Homander Log"
     }); //.navGrid('#pager_log',{edit:false,add:false,del:false});

     */

    var datapointsLastSel;
    var datapointsEditing = false;


    $("#grid_datapoints").jqGrid({
        datatype: "local",

        colNames:['id', 'aid','oid', getWord('TypeName'), getWord('Name'), getWord('Parent Name'), getWord('Value'), getWord('Timestamp'), getWord('ack'), getWord('lastChange')],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int"},
            {name:'adapter_id',index:'adapter_id', width:40, sorttype: "int"},
            {name:'object_id',index:'object_id', width:50, sorttype: "int"},
            {name:'type',index:'type', width:80},
            {name:'name',index:'name', width:240},
            {name:'parent',index:'parent', width:240},
            {name:'val',index:'val', width:160, editable:true},
            {name:'timestamp',index:'timestamp', width:140},
            {name:'ack',index:'ack', width:50},
            {name:'lastChange',index:'lastChange', width:140}
        ],
        rowNum:20,
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20,100,500,1000],
        pager: jQuery('#pager_datapoints'),
        sortname: 'timestamp',
        viewrecords: true,
        sortname: "id",
        sortorder: "asc",
        caption: getWord("datapoints"),
        onSelectRow: function(id){
            if(id && id!==datapointsLastSel){
                $('#grid_datapoints').restoreRow(datapointsLastSel);
                datapointsLastSel=id;
            }
            $('#grid_datapoints').editRow(id, true, function () {
                // onEdit
                datapointsEditing = true;
            }, function (obj) {
                // success
            }, "clientArray", null, function () {
                // afterSave
                datapointsEditing = false;
                //console.log(datapointsLastSel+ " "+$("#grid_datapoints").jqGrid("getCell", datapointsLastSel, "val"));
                socket.emit('setPointValue', datapointsLastSel, $("#grid_datapoints").jqGrid("getCell", datapointsLastSel, "val"), null, false);
            });
        }
    }).jqGrid('filterToolbar',{
            autosearch: true,
            searchOnEnter: false,
            enableClear: false
        }).navGrid('#pager_datapoints',{search:false, refresh: false, edit:false,add:true,addicon: "ui-icon-refresh", del:false, addfunc: function() {
            $datapointGrid.jqGrid("clearGridData");
            loadDatapoints();
        }});

    $("#loader_message").append(translateWord("loading index") + " ... <br/>");

    socket.emit('getIndex', function(obj) {
        function showIndex (obj) {
            var t = '';
            for (var n in obj) {
                t  += '<h1>' + n + '</h1>\n';
                for (var i in obj[n]){
                    t  += '<p>' + i + ' - ' + JSON.stringify(obj[n][i], null, "  ") + '<p>';
                }
            }
            return t;
        }


        //$("#index").html(JSON.stringify(obj, null, "  "));
        $("#index").html (showIndex(obj));
        dataIndex = obj;
        $("#loader_message").append(translateWord("loading objects") + " ... <br/>");

        socket.emit('getObjects', function(obj) {
            dataObjects = obj;

            // Stringify
            //$("#meta").html(JSON.stringify(obj, null, "  "));

            socket.on('event', function(combyId, value) {
                var id = [combyId >> cAdapterShift, combyId & cObjectsMask, combyId];

                value.val = $('<div/>').text(value.val).html();

                // Update Datapoint Grid
                var oldData = $datapointGrid.jqGrid('getRowData', obj[0]);

                if (!datapointsEditing || datapointsLastSel != combyId) {
                    var data = {
                        id:         combyId,
                        name:       oldData.name,
                        parent:     oldData.parent,
                        type:       oldData.type,
                        val:        value.val,
                        timestamp:  (value.ts == "1970-01-01 01:00:00" ? "" : value.ts),
                        ack:        value.ack,
                        lastChange: (value.lc == "1970-01-01 01:00:00" ? "" : value.lc)
                    };
                    $datapointGrid.jqGrid('setRowData', combyId, data);
                }
                if ($mainTabs.tabs("option", "active") == 4 && $subTabs5.tabs("option", "active") == 2 && !datapointsEditing) {
                    $datapointGrid.trigger("reloadGrid");
                }

                // Update Event Grid
                var data = {
                    id:         eventCounter,
                    ise_id:     combyId,
                    adapter_id: id[0/*cAdapterId*/],
                    object_id:  id[1/*cObjectId*/],
                    type:       (dataObjects[id[cAdapterId]][id[cObjectId]] ? dataObjects[id[cAdapterId]][id[cObjectId]].specType : ""),
                    name:       (dataObjects[id[cAdapterId]][id[cObjectId]] ? dataObjects[id[cAdapterId]][id[cObjectId]].name : ""),
                    parent:     (dataObjects[id[cAdapterId]][id[cObjectId]] && dataObjects[id[cAdapterId]][id[cObjectId]].parent ? dataObjects[id[cAdapterId]][dataObjects[id[cAdapterId]][id[cObjectId]].parent].name : ""),
                    value:      value.val,
                    timestamp:  value.ts,
                    ack:        value.ack,
                    lastchange: value.lc
                };
                $eventGrid.jqGrid('addRowData', eventCounter++, data, "first");
                //console.log($mainTabs.tabs("option", "active") + " " + $subTabs5.tabs("option", "active"));
                if ($mainTabs.tabs("option", "active") == 3 && $subTabs5.tabs("option", "active") == 3) {
                    $eventGrid.trigger("reloadGrid");
                }
            });

            loadDatapoints();
        });
    });

    function oneAdapterLine (adapterId) {
        var btnSettings = '<button class="adapter-settings translateB" data-adapter="'+adapterId+
            '" data-lang="'+((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+'">'+
            translateWord('configure')+'</button>';
        var btnRefresh = '<button class="adapter-restart translateB" data-lang="'+
            ((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+'" data-adapter="'+adapterId+'">'+
            translateWord('reload')+'</button>';
        var btnDelete = '<button class="adapter-delete translateB" data-lang="'+
            ((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+'" data-adapter="'+adapterId+'">'+
            translateWord('delete')+'</button>';

        return {
            id:         adapterId,
            name:       mainSettings.adapters[adapterId].name + " - " + availAdapters[mainSettings.adapters[adapterId].type].description,
            settings:   btnSettings+btnRefresh+btnDelete,
            confed:     (mainSettings.adapters[adapterId].configured ? "true":"false"),
            mode:       (mainSettings.adapters[adapterId].mode)  ? getWord(mainSettings.adapters[adapterId].mode):"",
            period:     (mainSettings.adapters[adapterId].period ? mainSettings.adapters[adapterId].period:"")
        }
    }

    function loadDatapoints() {
        $("#loader_message").append(translateWord("loading datapoints") + " ... <br/>");

        socket.emit('getPointValues', function(dataValues) {
            for (var adapterId = 0, len = dataValues.length; adapterId < len; adapterId++) {
                if (!dataValues[adapterId]) {
                    continue
                }
                for (var objId = 0, _len = dataValues[adapterId].length; objId < _len; objId++) {
                    if (!dataValues[adapterId][objId]) {
                        continue;
                    }
                    var combyId = adapterId << cAdapterShift | objId;
                    var data = {
                        id:         combyId,
                        adapter_id: adapterId,
                        object_id:  objId,
                        name:       (dataObjects[adapterId][objId] ? dataObjects[adapterId][objId].name : ""),
                        parent:     (dataObjects[adapterId][objId] && dataObjects[adapterId][objId].parent ? dataObjects[adapterId][dataObjects[adapterId][objId].parent].name : ""),
                        type:       (dataObjects[adapterId][objId] ? dataObjects[adapterId][objId].specType : ""),
                        val:        $('<div/>').text(dataValues[adapterId][objId].val).html(),
                        timestamp:  (dataValues[adapterId][objId].ts == "1970-01-01 01:00:00" ? "" : dataValues[adapterId][objId].ts),
                        ack:        dataValues[adapterId][objId].ack,
                        lastChange: (dataValues[adapterId][objId].lc == "1970-01-01 01:00:00" ? "" : dataValues[adapterId][objId].lc)
                    };
                    $("#grid_datapoints").jqGrid('addRowData',combyId,data);
                }
            }
            $("#loader").remove();
            $("#grid_datapoints").trigger("reloadGrid");
        });
    }

    function getWord (word) {
        return "<span class='translate' data-lang='"+((mainSettings && mainSettings.language) ? mainSettings.language : 'en')+"'>"+translateWord(word)+"</span>";
    }

    $("#grid_addons").jqGrid({
        datatype: "local",
        colNames:['id', getWord('name'), getWord('installed version'), getWord('available version'), getWord('homepage'), getWord('download')],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int", hidden: true},
            {name:'name',index:'name', width:340, sorttype: "int"},
            {name:'installedVersion',index:'installedVersion', width:120},
            {name:'availableVersion',index:'availableVersion', width:120},
            {name:'homepage',index:'homepage', width:440},
            {name:'download',index:'download', width:120}
        ],
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20],
        //pager: $('#pager_addons'),
        sortname: "id",
        sortorder: "asc",
        viewrecords: true,
        caption: getWord("Addons")
    });

    $("#grid_adapter").jqGrid({
        datatype: "local",
        colNames:['id', getWord('name'), getWord('settings'), getWord('confed'), getWord('mode'), getWord('period')],
        colModel:[
            {name:'id',      index:'id',       width:60,  sorttype: "int", hidden: true},
            {name:'name',    index:'name',     width:340, sorttype: "int"},
            {name:'settings',index:'settings', width:120, sorttype: "int"},
            {name:'confed',  index:'confed',   width:100, hidden: true},
            {name:'mode',    index:'mode',     width:100},
            {name:'period',  index:'period',   width:100}
        ],
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20],
        //pager: $('#pager_addons'),
        sortname: "id",
        sortorder: "asc",
        viewrecords: true,
        caption: getWord("Adapter")
    });

    $("#grid_events").jqGrid({
        datatype: "local",
        colNames:[getWord('eventCount'),'id', 'aid', 'oid', getWord('TypeName'), getWord('Name'), getWord('Parent Name'),getWord('Value'), getWord('Timestamp'), getWord('ack'), getWord('lastChange')],
        colModel:[
            {name:'id',index:'id', width:60, sorttype: "int", hidden: true},
            {name:'ise_id',index:'ise_id', width:60, sorttype: "int"},
            {name:'adapter_id',index:'adapter_id', width:40, sorttype: "int"},
            {name:'object_id',index:'object_id', width:50, sorttype: "int"},
            {name:'type',index:'type', width:80},
            {name:'name',index:'name', width:240},
            {name:'parent',index:'parent', width:240},
            {name:'value',index:'value', width:160},
            {name:'timestamp',index:'timestamp', width:140},
            {name:'ack',index:'ack', width:50},
            {name:'lastchange',index:'lastchange', width:140}
        ],
        cmTemplate: {sortable:false},
        rowNum:20,
        autowidth: true,
        width: 1200,
        height: 440,
        rowList:[20,100,500,1000],
        pager: $('#pager_events'),
        sortname: "id",
        sortorder: "desc",
        viewrecords: true,
        sortorder: "desc",
        caption: getWord("Events"),
        ignoreCase:true
    }).jqGrid('filterToolbar',{
            defaultSearch:'cn',

            autosearch: true,
            searchOnEnter: false,
            enableClear: false
        }).navGrid('#pager_events',{search:false, refresh:false, edit:false,add:true, addicon: "ui-icon-trash", del:false, addfunc: function () {
            $eventGrid.jqGrid("clearGridData");
            eventCounter = 0;
        }});

    function resizeGrids() {
        var x = $(window).width();
        var y = $(window).height();
        if (x < 720) { x = 720; }
        if (y < 480) { y = 480; }
        $(".gridSub").setGridHeight(y - 250).setGridWidth(x - 100);
        $(".gridMain").setGridHeight(y - 180).setGridWidth(x - 60);
        $("#grid_addons").setGridHeight(y - 180).setGridWidth(x - 60);
        $("#adapter_config_json").css("width", x-60);
        $("#adapter_config_json").css("height", y-180);
        $("#adapter_config_container").css("width", x-60);
        $("#adapter_config_container").css("height", y-200);

    }

    $(window).resize(function() {
        resizeGrids();
    });

    $("#saveSettings").button().click(saveSettings);


    var addonInstall = {
        "dashui":           "https://github.com/hobbyquaker/DashUI/archive/master.zip",
        "slimui":           "https://github.com/hobbyquaker/SlimUI/archive/master.zip",
        "yahui":            "https://github.com/hobbyquaker/yahui/archive/master.zip"
        /*"eventlist":        "https://github.com/GermanBluefox/homander.Eventlist/archive/master.zip",
        "charts":           "https://github.com/hobbyquaker/homander-Highcharts/archive/master.zip",
        "ScriptGUI":        "https://github.com/smiling-Jack/homander.ScriptGUI/archive/master.zip",
        "ScriptEditor":     "https://github.com/smiling-Jack/homander.ScriptEditor/archive/master.zip"*/
    };

    $("#install_addon").button().click(function () {
        $("#install_addon_dialog").dialog("open");
    });

    $("#install_addon_button").button().click(function () {
        var addon = $("#install_addon_select option:selected").val();
        if (addon) {
            $("#install_addon_dialog").dialog("close");
            socket.emit("updateAddon", addonInstall[addon], addon, function (err) {
                if (err) {
                    showMessage (err);
                } else {
                    showMessage ("install started");
                }
            });
        }

    });

    // Add new adapter
    $('#adapter_add').button().click(function () {
        // get current value of select
        var adapterName = $("#avail_adapters option:selected").val();
        var adapterId = availAdapters[adapterName].desiredId;
        if (!adapterId || mainSettings.adapters[adapterId]) {
            adapterId = cUserAdapter;
            // Find free index
            while (mainSettings.adapters[adapterId]) adapterId++;
            if (adapterId > cAdapterMask) {
                console.log ("Too many adapters");
                return;
            }
        }

        mainSettings.adapters[adapterId] = {mode: availAdapters[adapterName].mode, name: availAdapters[adapterName].name, settings: availAdapters[adapterName].settings, configured: false};
        mainSettings.adapters[adapterId].type = mainSettings.adapters[adapterId].name;
        // Extend name of non-unique adapter with adapter ID
        if (!availAdapters[adapterName].isUnique) {
            mainSettings.adapters[adapterId].name += "_" + adapterId;
        }
        else {
            $("#avail_adapters option[value='"+adapterName+"']").each(function() {
                $(this).remove();
            });
        }
        if (availAdapters[adapterName].period) {
            mainSettings.adapters[adapterId].period = availAdapters[adapterName].period;
        }
        var adapterData = oneAdapterLine(adapterId);
        $("#grid_adapter").jqGrid("addRowData", adapterId, adapterData);

        $(".adapter-settings").click(function () {
            editAdapterSettings($(this).attr("data-adapter"));
        });
        $(".adapter-restart").click(function () {
            restartAdapter($(this).attr("data-adapter"));
        });
        $(".adapter-delete").click(function () {
            deleteAdapter ($(this).attr("data-adapter"));
        });
    });

    function loadSettings() {
        $("#language [value='"+(mainSettings.language || 'en')+"']").attr("selected", "selected");

        $("#language").change(function () {
            translateAll ($(this).val());
        });

        if (mainSettings.stats) {
            $("#stats").attr("checked", true);
        } else {
            $("#stats").removeAttr("checked");
        }
        $("#statsInterval").val(mainSettings.statsIntervalMinutes);

        if (mainSettings.logging.enabled) {
            $("#logging_enabled").attr("checked", true);
        } else {
            $("#logging_enabled").removeAttr("checked");
        }
        $("#logging_writeInterval").val(mainSettings.logging.writeInterval);

        if (mainSettings.scriptEngineEnabled) {
            $("#scriptEngineEnabled").attr("checked", true);
        } else {
            $("#scriptEngineEnabled").removeAttr("checked");
        }
        $("#longitude").val(mainSettings.longitude);
        $("#latitude").val(mainSettings.latitude);

        if (mainSettings.httpEnabled) {
            $("#httpEnabled").attr("checked", true);
        } else {
            $("#httpEnabled").removeAttr("checked");
        }
        $("#ioListenPort").val(mainSettings.ioListenPort  || $("#ioListenPort").attr("data-defaultval"));
        if (mainSettings.httpsEnabled) {
            $("#httpsEnabled").attr("checked", true);
        } else {
            $("#httpsEnabled").removeAttr("checked");
        }
        $("#ioListenPortSsl").val(mainSettings.ioListenPortSsl || $("#ioListenPortSsl").attr("data-defaultval"));

        if (mainSettings.authentication.enabled) {
            $("#authentication_enabled").attr("checked", true);
        } else {
            $("#authentication_enabled").removeAttr("checked");
        }
        if (mainSettings.authentication.enabledSsl) {
            $("#authentication_enabledSsl").attr("checked", true);
        } else {
            $("#authentication_enabledSsl").removeAttr("checked");
        }

        $("#authentication_user").val(mainSettings.authentication.user);
        $("#authentication_password").val(mainSettings.authentication.password);

        if (mainSettings.useCache) {
            $("#useCache").attr("checked", true);
        } else {
            $("#useCache").removeAttr("checked");
        }
    }

    function saveSettings() {
        mainSettings.language = $("#language").val();

        if ($("#stats").is(":checked")) {
            mainSettings.stats = true;
        } else {
            mainSettings.stats = false;
        }

        mainSettings.statsIntervalMinutes = $("#statsInterval").val();

        if ($("#logging_enabled").is(":checked")) {
            mainSettings.logging.enabled = true;
        } else {
            mainSettings.logging.enabled = false;
        }
        mainSettings.logging.writeInterval = $("#logging_writeInterval").val();

        if ($("#scriptEngineEnabled").is(":checked")) {
            mainSettings.scriptEngineEnabled = true;
        } else {
            mainSettings.scriptEngineEnabled = false;
        }
        mainSettings.longitude = $("#longitude").val();
        mainSettings.latitude = $("#latitude").val();

        if ($("#httpEnabled").is(":checked")) {
            mainSettings.httpEnabled = true;
        } else if ($("#httpsEnabled").is(":checked")) {
            mainSettings.httpEnabled = false;
        } else {
            mainSettings.httpEnabled = true;
        }
        mainSettings.ioListenPort = $("#ioListenPort").val();
        if ($("#httpsEnabled").is(":checked")) {
            mainSettings.httpsEnabled = true;
        } else {
            mainSettings.httpsEnabled = false;
        }
        mainSettings.ioListenPortSsl = $("#ioListenPortSsl").val();

        if ($("#authentication_enabled").is(":checked")) {
            mainSettings.authentication.enabled = true;

        } else {
            mainSettings.authentication.enabled = false;
        }
        if ($("#authentication_enabledSsl").is(":checked")) {
            mainSettings.authentication.enabledSsl = true;
        } else {
            mainSettings.authentication.enabledSsl = false;
        }

        mainSettings.authentication.user = $("#authentication_user").val();
        mainSettings.authentication.password = $("#authentication_password").val();
        if ($("#useCache").is(":checked")) {
            mainSettings.useCache = true;
        } else {
            mainSettings.useCache = false;
        }

        socket.emit("setSettings", mainSettings, function () {
            showMessage ("Homander settings saved. Please restart Homander");
        });
    }

    function restartAdapter(adapterId) {
        socket.emit("restartAdapter", adapterId, function (res) {
            showMessage(res);
        });
    }
    function deleteAdapter (adapterId) {
        var btn = {};
        btn[translateWord("Delete")] = function() {
            var type = mainSettings.adapters[adapterId].type;
            mainSettings.adapters[adapterId] = null;
            delete mainSettings.adapters[adapterId];
            mainSettings.adapters.slice (adapterId, 1);
            $('#grid_adapter').jqGrid('delRowData', adapterId);
            // Insert Adapter in the select dropdown element
            if (availAdapters[type].isUnique) {
                $("#avail_adapters").append($("<option></option>")
                    .attr("value", availAdapters[type].name)
                    .text(availAdapters[type].name + " - " + availAdapters[type].description));
            }

            saveSettings ();
            $( this ).dialog( "close" );
        };
        btn[translateWord("Cancel")] = function() {
            $( this ).dialog( "close" );
        };

        $( "#delete_adapter_dialog" ).dialog({
            resizable: false,
            height:    200,
            modal:     true,
            buttons:   btn
        });
    }

    function editAdapterSettings(adapterId) {
        $("#adapter_name").html(mainSettings.adapters[adapterId].name + " - " +
            availAdapters[mainSettings.adapters[adapterId].type].description);
        $("#adapter_name").attr("data-adapter", adapterId);
        $("#adapter_loading").show();
        $("#adapter_overview").hide();
        $("#adapter_config").hide();

        /*socket.emit("readFile", "adapter-"+adapter+".json", function (data) {
            try {
            $("#adapter_config_json").html(JSON.stringify(data, null, "    "));
            } catch (e) {
                $("#adapter_config_json").html("{}");
                showMessage("Error: reading adapter config - invalid JSON");
            }
            currentAdapterSettings = data;
            socket.emit("readRawFile", "adapter/"+adapter+"/settings.html", function (content) {
                $("#adapter_loading").hide();
                $("#adapter_config").show();
                if (content) {
                    $("#adapter_config_container").html(content);
                    $("#adapter_config_json").hide();
                    $("#adapter_config_container").show();
                } else {
                    $("#adapter_config_container").hide();
                    $("#adapter_config_json").show();
                    resizeGrids();
                }
            });
        });*/
        currentAdapterSettings = mainSettings.adapters[adapterId].settings;
        socket.emit("readRawFile", "adapter/"+mainSettings.adapters[adapterId].type+"/settings.html", function (content) {
            $("#adapter_loading").hide();
            $("#adapter_config").show();
            if (content) {
                $("#adapter_config_container").html(content);
                $("#adapter_config_json").hide();
                $("#adapter_config_container").show();
            } else {
                $("#adapter_config_container").hide();
                $("#adapter_config_json").show();
                resizeGrids();
            }
            updateAdapterSettings ();
        });
    }

    function saveAdapterSettings() {
        var adapterId = $("#adapter_name").attr("data-adapter");
        try {
            var adapterSettings = JSON.parse($("#adapter_config_json").val());
            mainSettings.adapters[adapterId].configured = true;
            mainSettings.adapters[adapterId].settings   = adapterSettings;
            socket.emit("setSettings", mainSettings, function () {
                showMessage ("Homander settings saved. Please restart Homander");
            });
            return true;
        } catch (e) {
            showMessage("Error: invalid JSON");
            return false;
        }
    }

    function showMessage(text, caption) {
        if (!text) {
            $('#dialogModal').dialog("close");
            return;
        }
        $('#dialogModal').show();
        $('#dialogModal').html("<p>"+translateWord (text) +"</p>").attr('title', translateWord (caption || "Message"));
        $( "#dialogModal" ).dialog({
            height: 200,
            modal: true,
            buttons: {
                "Ok": function () {
                    $( this ).dialog( "close" );
                }
            }
        });
    }

    $("#adapter_save").button().click(saveAdapterSettings);

    $("#adapter_close").button().click(function () {
        if (saveAdapterSettings()) {
            $("#adapter_config").hide();
            $("#adapter_overview").show();
        }
    });

    $("#adapter_cancel").button().click(function () {
        $("#adapter_config").hide();
        $("#adapter_overview").show();
    });


});