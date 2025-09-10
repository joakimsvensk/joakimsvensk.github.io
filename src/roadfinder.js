//----------------------------------------
// ROADFINDER v2.0
// Copyright Joakim Svensk 2016-2020
//----------------------------------------

// GLOBAL DEFINITIONS

this.static_files_url = "https://pub-88e7e9e2eabe421b9ffae40f404b56a5.r2.dev";

this.print_debug = false;

this.menu_enabled = true;
this.route_buttons_enabled = false;
this.toolbar_buttons_enabled = false;
this.state = "home";
this.canceled = false;
this.busy = false;

this.mapmarkers = [];
this.measuremarkers = [];
this.lastmeasurepoint = [];
this.measureactive = false;
this.totalmeasurelength = 0;
this.preventsingleclick = false;
this.clicktimer = 0;

this.startpoint = "";
this.endpoint = "";
this.waypoints = [];

this.totalroutelength = 0;
this.routetoexport = 0;
this.completenet = {};
this.nettilesdownloaded = [];
this.candidateWaypoints = [];
this.savedroutes = {};
this.goaldist = 50000;
this.routefactor = 0.5;

this.maxnetsize = 50;
this.maxroutedist = Infinity;
this.routes = [];

this.sweref99def = '+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +axis=neu +no_defs';
this.wgs84def = '+title=WGS 84 (long/lat) +proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees';

// MAP MARKERS

var starticon = L.icon({
    iconUrl: 'fig/circular-icon.png',
    iconSize: [16, 16],
	iconAnchor: [8, 8]
});

var waypointicon = L.icon({
    iconUrl: 'fig/circular-icon.png',
    iconSize: [10, 10],
	iconAnchor: [5, 5]
});

var endicon = L.icon({
    iconUrl: 'fig/circular-icon.png',
    iconSize: [16, 16],
	iconAnchor: [8, 8]
});

// EVENT HANDLERS

$(document).ready(function () {
	
	// Menu
    $('#menu-info').click(function(){
		if (window.menu_enabled) {
			document.getElementById("info-content-container").style.display = "block";
			fadeBackgroundToGray();
			disableMenu();
			ga('set', 'page', '/infoview');
			ga('send', 'pageview');
		}
    });
	$('#menu-route').click(function(){
		if (window.menu_enabled) {
			openNavMenu();
			ga('set', 'page', '/routeview');
			ga('send', 'pageview');
		}
	});
	$('#menu-export').click(function(){
		if (window.menu_enabled && window.route_buttons_enabled) {
			if (window.mapmarkers.length == 1) {
				openExportMenu(0);
			} else {
				setExportState();
			}
			ga('set', 'page', '/exportview');
			ga('send', 'pageview');
		}
	});
	$('#menu-clear').click(function(){
		if (window.menu_enabled && window.route_buttons_enabled) {
			clearMap();
		}
	});
	
	// Toolbar
	$('#toolbar-cancel').click(function(){
		cancelTask();
	});
	$('#toolbar-undo').click(function(){
	    if (window.toolbar_buttons_enabled) {
		    undoRouting();
	    }
	});
	$('#toolbar-done').click(function(){
	    if (window.toolbar_buttons_enabled) {
		    doneRouting();
	    }
	});
	
	//Info box
	$('#close-info').click(function(){
        document.getElementById("info-content-container").style.display = "none";
        fadeBackgroundFromGray();
        enableMenu();
    });
	
	// Alert box
	$('#alert-message-close-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("alert-message-container").style.display = "none";
	});
	
	// Export menu
	$('#export-menu-close-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("export-menu-container").style.display = "none";
	});
	$('#export-menu-gpx-button').click(function(){
		exportFile("gpx");
	});
	$('#export-menu-geojson-button').click(function(){
		exportFile("geojson");
	});
	
	// Nav menu
	$('#nav-menu-close-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("nav-menu-container").style.display = "none";
	});
	$('#nav-menu-round-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("nav-menu-container").style.display = "none";
		openRoundMenu();
	});
	$('#nav-menu-route-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("nav-menu-container").style.display = "none";
		openRouteMenu();
	});
	
	// Route menu
	$('#route-menu-close-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("route-menu-container").style.display = "none";
	});
	$('#route-menu-start-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("route-menu-container").style.display = "none";
		setRouteState();
	});
	
	// Round menu
	$('#round-menu-close-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("round-menu-container").style.display = "none";
	});
	$('#round-menu-start-button').click(function(){
		fadeBackgroundFromGray();
		document.getElementById("round-menu-container").style.display = "none";
		setRoundState();
	});
	
	// Measure control
	$('#measure-button').click(function(){
		toggleMeasure();
	});
	
	$('#round-slider').on('input', updateRoundSlideValue);
	$('#route-slider').on('input', updateRouteSlideValue);
});

$( window ).resize(function() {
  document.getElementById("info-content-container").height = window.innerHeight;
});

function onMapClick(e) {
	if (window.print_debug) {
		console.log("Map Clicked:", window.state, "Busy:", window.busy);
	}
	window.clicktimer = setTimeout(function() {
	    if(!window.preventsingleclick) {
        	if(!window.busy) {
        		window.canceled = false;
        		if (window.state == "route-addstart") {
        			addStartToRoute(e);
        		} else if(window.state == "route-addwaypoint") {
        			addWayPointToRoute(e);
        		} else if(window.state == "round-addstart") {
        			planRound(e.latlng.lat, e.latlng.lng, window.goaldist);
        		}
        		
        		if (window.measureactive) {
        		    measureClick(e);
        		}
        		
        	} else {
        		if (window.print_debug) {
        			console.log("	Busy, not registering click.");
        		}
        	}
	    }
	    window.preventsingleclick = false;
    }, 200);
}

function onMapDoubleClick(e) {
    clearTimeout(window.clicktimer);
    window.preventsingleclick = true;
    window.setTimeout(function(){
		window.preventsingleclick = false;
	}, 500);
	
    if(!window.busy) {
    	if (window.measureactive) {
    	    measureDoubleClick(e);
    	}
    }
}

function onMapZoomEnd() {
	if (window.print_debug) {
		console.log("Zoomlevel:",zoomlevel);
	}
	
	var zoomlevel = map.getZoom();
	if (zoomlevel <= 9) {
		for (var i=0; i<window.mapmarkers.length; i++) {
			window.mapmarkers[i][decideMapMarkerGroup("navlength")].remove();
		}
	} else {
		for (var i=0; i<window.mapmarkers.length; i++) {
			window.mapmarkers[i][decideMapMarkerGroup("navlength")].addTo(map);
		}
	}
}

// UI FUNCTIONS

function isMobile() {
	var check = false;
	(function(a){if(/(android|bb\d+|meego).+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|mobile.+firefox|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|series(4|6)0|symbian|treo|up\.(browser|link)|vodafone|wap|windows ce|xda|xiino/i.test(a)||/1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4))) check = true;})(navigator.userAgent||navigator.vendor||window.opera);
	return check;
}

function toggleMeasure() {
    if (window.measureactive) {
        clearMeasurements();
        document.getElementById("map").style.removeProperty("cursor");
        map.doubleClickZoom.enable();
        document.getElementById("measure-button").classList.add('measure-button-nonactive');
	    document.getElementById("measure-button").classList.remove('measure-button-active');
        window.measureactive = false;
    } else {
    	document.getElementById("map").style.cursor = "crosshair";
    	map.doubleClickZoom.disable();
    	document.getElementById("measure-button").classList.add('measure-button-active');
	    document.getElementById("measure-button").classList.remove('measure-button-nonactive');
        window.measureactive = true;
        window.measurestate = "measure-addstart";
    }
}

function clearMeasurements() {
	for (var i=0; i<window.measuremarkers.length; i++) {
		window.measuremarkers[i].remove();
	}
    window.measuremarkers = [];
}

function measureDoubleClick(e) {
    if (window.measurestate == "measure-addpoint") {
        measureAddPoint(e,"endpoint");
        window.measurestate = "measure-addstart";
    }
}

function measureClick(e) {
    console.log(window.measurestate);
    if (window.measurestate == "measure-addstart") {
        var startpoint = L.marker([e.latlng.lat, e.latlng.lng], {icon: waypointicon});
        window.totalmeasurelength = 0;
        window.measuremarkers.push(startpoint);
        startpoint.addTo(map);
        
        window.lastmeasurepoint = [e.latlng.lat, e.latlng.lng];
        window.measurestate = "measure-addpoint";
    } else {
        measureAddPoint(e,"waypoint");
    }
}

function measureAddPoint(e, type) {
    var coords = [window.lastmeasurepoint, [e.latlng.lat, e.latlng.lng]];
    
    var point_sweref_yx_start = proj4(window.wgs84def,window.sweref99def,[window.lastmeasurepoint[1], window.lastmeasurepoint[0]]);
    var point_sweref_yx_end = proj4(window.wgs84def,window.sweref99def,[e.latlng.lng, e.latlng.lat]);
    
	var xs = point_sweref_yx_start[1];
	var ys = point_sweref_yx_start[0];
	var xe = point_sweref_yx_end[1];
	var ye = point_sweref_yx_end[0];
	
	console.log(xs,ys,xe,ye);
	
    var dist = Math.sqrt(Math.pow((xe-xs),2)+Math.pow((ye-ys),2));
    window.totalmeasurelength += dist;
    
    var line = L.polyline([coords], { className: 'measure-line' });
    var endpoint = L.marker([e.latlng.lat, e.latlng.lng], {icon: waypointicon});
    
	var lengthmarker = L.marker([e.latlng.lat, e.latlng.lng], {
	icon: L.divIcon({
		className: 'measure-length-icon-' + type,
		iconSize: null,
		iconAnchor: [0,0],
		html: Math.round(window.totalmeasurelength/100)/10 + ' km'
		})
	});
    
    window.measuremarkers.push(line);
    window.measuremarkers.push(endpoint); 
    window.measuremarkers.push(lengthmarker);
    
    for (var i=0; i<window.measuremarkers.length; i++) {
		window.measuremarkers[i].addTo(map);
	}
	
    window.lastmeasurepoint = [e.latlng.lat, e.latlng.lng];
}

function clearMap(){
	if (window.print_debug) {
		console.log("ClearMap");
	}
	
	for (var i=0; i<window.mapmarkers.length; i++) {
		for (var j=0; j<window.mapmarkers[i].length; j++) {
			window.mapmarkers[i][j].remove();
		}
	}
	window.mapmarkers = [];
	window.routes = [];
	resetState();
}

function decideMapMarkerGroup(type) {
    var group;
    switch(type){
        case "waypoint":
            group = 0;
            break;
            
        case "navline":
            group = 1;
            break;
            
        case "navlength":
            group = 2;
            break;
            
        case "totalnavlength":
            group = 3;
            break;
        
        case "endpoint":
            group = 4;
            break;
        
        case "startpoint":
            group = 5;
            break;
           
        default:
            group = 0;
    }
    return group;
}

function addMapMarker(type, marker){
    var group = decideMapMarkerGroup(type);
    
    window.mapmarkers[window.mapmarkers.length-1][group].remove();
	marker.addTo(window.mapmarkers[window.mapmarkers.length-1][group]);
	window.mapmarkers[window.mapmarkers.length-1][group].addTo(map);
}

function removeMapMarker(type, index){
    var group = decideMapMarkerGroup(type);
    
    if (index == "allroutes") {
        for (var i=0; i<window.mapmarkers.length; i++) {
            window.mapmarkers[i][group].remove();
            window.mapmarkers[i][group] = L.featureGroup();
            window.mapmarkers[i][group].addTo(map);
        }
        
    } else if (index == "lastroute") {
        window.mapmarkers[window.mapmarkers.length-1][group].remove();
        window.mapmarkers[window.mapmarkers.length-1][group] = L.featureGroup();
        window.mapmarkers[window.mapmarkers.length-1][group].addTo(map);
        
    } else if (index == "lastmarker") {
        window.mapmarkers[window.mapmarkers.length-1][group].remove();
        var layers = window.mapmarkers[window.mapmarkers.length-1][group].getLayers();
        window.mapmarkers[window.mapmarkers.length-1][group].removeLayer(layers[layers.length-1]);
        window.mapmarkers[window.mapmarkers.length-1][group].addTo(map);
    }
    
	var zoomlevel = map.getZoom();
	if (zoomlevel <= 9) {
		for (var i=0; i<window.mapmarkers.length; i++) {
			window.mapmarkers[i][decideMapMarkerGroup("navlength")].remove();
		}
	}
}

function showAlertMessage(message){
	if (window.print_debug) {
		console.log("ShowAlertMessage:",message);
	}
	
	fadeBackgroundToGray();
	document.getElementById("alert-message-text").innerHTML = message;
	document.getElementById("alert-message-container").style.display = "block";
}

function setHelpText(glyph,message,cb){
	if (window.print_debug) {
		console.log("SetHelpText:",message);
	}
	
	if(message){
		document.getElementById("help-text").innerHTML = '<span><i class="help-text-glyphicon glyphicon glyphicon-' + glyph + '"></i>' + message + '</span>';
		document.getElementById("help-text").style.display = "block";
	} else {
		document.getElementById("help-text").style.display = "none";
	}
	if(cb) {
		window.setTimeout(function(){
			cb();
		},50);
	}
}

function updateRoundSlideValue() {
	var slider = document.getElementById("round-slider");
	var slide_value_text = document.getElementById("round-menu-value");
	slide_value_text.innerHTML = slider.value + " km";
	window.goaldist = parseInt(slider.value)*1000;
}

function updateRouteSlideValue() {
	var slider = document.getElementById("route-slider");
	var slide_value_text = document.getElementById("route-menu-value");
	slide_value_text.innerHTML = slider.value;
	window.routefactor = (parseInt(slider.value)-1)/4;
}


function cancelTask(){
	window.canceled = true;
	window.busy = false;
	if (window.state == "route-addwaypoint" || window.state == "route-addstart" || window.state == "round-addstart") {
		
		removeMapMarker("waypoint","lastroute");
		removeMapMarker("navline","lastroute");
		removeMapMarker("navlength","lastroute");
		removeMapMarker("totalnavlength","lastroute");
		removeMapMarker("endpoint","lastroute");
		removeMapMarker("startpoint","lastroute");
		
		window.mapmarkers.pop();
		window.routes.pop();
	}
	resetState();
}

function setRouteState() {
	if (window.print_debug) {
		console.log("SetRouteState");
	}
	
	window.state = "route-addstart";
	var feature_id = window.mapmarkers.length;
	var feature_groups = [];
	for (var i=0; i<6; i++) {
		var feature_group = L.featureGroup();
		feature_group.on('click', function(e) {featureClicked(feature_id)});
		feature_groups.push(feature_group);
	}
	window.mapmarkers.push(feature_groups);
	window.routes.push({'nodes':[],'net':[],'avgrank':[],'routelength':[]});
	document.getElementById("map").style.cursor = "crosshair";
	showToolbar(["cancel","undo","done"]);
	setHelpText("info-sign","Markera startpunkt");
	disableMenu();
}

function setRoundState() {
	if (window.print_debug) {
		console.log("SetRoundState");
	}
	
	window.state = "round-addstart";	
	var feature_id = window.mapmarkers.length;
	var feature_groups = [];
	for (var i=0; i<6; i++) {
		var feature_group = L.featureGroup();
		feature_group.on('click', function(e) {featureClicked(feature_id)});
		feature_groups.push(feature_group);
	}
	window.mapmarkers.push(feature_groups);
	window.routes.push({'nodes':[],'net':[],'avgrank':[],'routelength':[]});
	document.getElementById("map").style.cursor = "crosshair";
	showToolbar(["cancel"]);
	setHelpText("info-sign","Markera startpunkt");
	disableMenu();
}

function setExportState() {
	if (window.print_debug) {
		console.log("SetExportState");
	}
	
	window.state = "export";
	showToolbar(["cancel"]);
	setHelpText("info-sign","Tryck på en rutt att exportera");
	disableMenu();
}

function openExportMenu(routeid) {
	fadeBackgroundToGray();
	window.routetoexport = routeid;
	document.getElementById("export-menu-container").style.display = "block";
}

function openNavMenu() {
	fadeBackgroundToGray();
	document.getElementById("nav-menu-container").style.display = "block";
}

function openRoundMenu() {
	fadeBackgroundToGray();
	document.getElementById("round-menu-container").style.display = "block";
}

function openRouteMenu() {
	fadeBackgroundToGray();
	document.getElementById("route-menu-container").style.display = "block";
}

function resetState() {
	if (window.print_debug) {
		console.log("ResetState");
	}
	
	window.state = "home";
	document.getElementById("map").style.removeProperty("cursor");
	
	window.toolbar_buttons_enabled = false;
	
	document.getElementById("toolbar-cancel").style.display = "none";
	document.getElementById("toolbar-undo").style.display = "none";
	document.getElementById("toolbar-done").style.display = "none";

	document.getElementById("toolbar-undo").classList.add('button-disabled');
	document.getElementById("toolbar-undo").classList.remove('button');
	
	document.getElementById("toolbar-done").classList.add('button-disabled');
	document.getElementById("toolbar-done").classList.remove('button');
	
	if (window.mapmarkers.length > 0) {
		window.route_buttons_enabled = true;
		document.getElementById("menu-clear").classList.add('button');
		document.getElementById("menu-clear").classList.remove('button-disabled');
		document.getElementById("menu-export").classList.add('button');
		document.getElementById("menu-export").classList.remove('button-disabled');
	} else {
		window.route_buttons_enabled = false;
		document.getElementById("menu-clear").classList.add('button-disabled');
		document.getElementById("menu-clear").classList.remove('button');
		document.getElementById("menu-export").classList.add('button-disabled');
		document.getElementById("menu-export").classList.remove('button');
		
	}
	setHelpText(null);
	enableMenu();
}

function disableMenu() {
	window.menu_enabled = false;
	document.getElementById("menu-info").classList.remove('button');
	document.getElementById("menu-route").classList.remove('button');
	document.getElementById("menu-clear").classList.remove('button');
	document.getElementById("menu-export").classList.remove('button');
	document.getElementById("menu-info").classList.add('button-disabled');
	document.getElementById("menu-route").classList.add('button-disabled');
	document.getElementById("menu-clear").classList.add('button-disabled');
	document.getElementById("menu-export").classList.add('button-disabled');
}

function enableMenu() {
	window.menu_enabled = true;
	document.getElementById("menu-info").classList.add('button');
	document.getElementById("menu-route").classList.add('button');
	document.getElementById("menu-info").classList.remove('button-disabled');
	document.getElementById("menu-route").classList.remove('button-disabled');
	
	if (window.route_buttons_enabled) {			
		document.getElementById("menu-clear").classList.add('button');
		document.getElementById("menu-export").classList.add('button');
		document.getElementById("menu-clear").classList.remove('button-disabled');
		document.getElementById("menu-export").classList.remove('button-disabled');
	}
}

function showToolbar(buttons) {
	for (var i=0; i<buttons.length; i++) {
		document.getElementById("toolbar-" + buttons[i]).style.display = "block";
	}
	document.getElementById("toolbar-button-box").style.width = ((buttons.length)*125).toString() + "px";
	var children = document.getElementById("toolbar-button-box").childElementCount;
	for (var i=0; i<children; i++) {
		document.getElementById("toolbar-button-box").childNodes[(i*2)+1].style.maxWidth = ((1/buttons.length)*96).toString() + "%";
	}
}

function fadeBackgroundToGray() {
	document.getElementById("gray-background").style.display = "block";
}

function fadeBackgroundFromGray() {
	document.getElementById("gray-background").style.display = "none";
}

// EXPORT

function featureClicked(id) {
	if (window.print_debug) {
		console.log("Feature clicked:", id);
	}
	
	if (window.state == "export") {
		map.closePopup();
		resetState();
		openExportMenu(id);
	}
}

function closeRouteInfoBox(id) {
	var box = document.getElementById('route-info-box-' + id.toString())
	box.style.display = "none";
	box.parentNode.removeChild(box);
}

function exportFile(type) {
	var routeid = window.routetoexport;
	var features_to_export = [];
	var coords = [];
	
	for (var i=0; i<window.mapmarkers[routeid][1].getLayers().length; i++) {
		features_to_export.push(window.mapmarkers[routeid][1].getLayers()[i].toGeoJSON());
	}
	for (var i=0; i<features_to_export.length; i++) {
		coords.push(features_to_export[i].geometry.coordinates[0]);
	}
	
	var date = new Date();
	
	var filename = "roadfinder_export_" + date.getYear().toString() + (date.getMonth()+1).toString() + date.getDate().toString() + date.getHours().toString() + date.getMinutes().toString() + date.getSeconds().toString();
	filename += "." + type;
	
	if (type == "gpx") {
		var fileContent = '<?xml version="1.0"?> <gpx version="1.1" creator="RoadFinder - https://www.roadfinder.se" xmlns="http://www.topografix.com/GPX/1/1" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd"><trk><desc>Track exported from RoadFinder</desc>';
		for (var i=0; i<coords.length; i++) {
			fileContent += '<trkseg>';
			for (var j=0; j<coords[i].length; j++) {
				fileContent += '<trkpt lat="' + coords[i][j][1] + '" lon="' + coords[i][j][0] + '"></trkpt>';
			}
			fileContent += '</trkseg>';
		}
		fileContent += '</trk></gpx>';
	} else if (type == "geojson") {
		var fileContent = JSON.stringify({"type":"FeatureCollection", "features":features_to_export});
	}
	
	downloadFile(filename,fileContent);
	document.getElementById("export-menu-container").style.display = "none";
	fadeBackgroundFromGray();
}

function downloadFile(filename, content) {
  var linkelement = document.createElement('a');
  var blob = new Blob([content],{type: "application/gpx+xml"});
  
  linkelement.setAttribute('href', window.URL.createObjectURL(blob));
  linkelement.setAttribute('download', filename);
  linkelement.style.display = 'none';
  document.body.appendChild(linkelement);
  linkelement.click();
  document.body.removeChild(linkelement);
}

// ROUTE FINDING

function countProperties(obj) {
	if (window.print_debug) {
		console.log("CountProperties:",obj);
	}
	
    var count = 0;
    for(var prop in obj) {
        if(obj.hasOwnProperty(prop)){
            count++;
		}
    }
	
	if (window.print_debug) {
		console.log("	return:",count);
    }
	return count;
}

function uniqueInArray(a) {
    var seen = {};
    var out = [];
    var len = a.length;
    var j = 0;
    for(var i = 0; i < len; i++) {
         var item = a[i];
         if(seen[item] !== 1) {
               seen[item] = 1;
               out[j++] = item;
         }
    }
    return out;
}

function getAbsDist(node1, node2) {
	if (window.print_debug) {
		console.log("GetAbsDist:",node1,node2);
	}
	
    var xs = parseInt(node1.substring(0,node1.indexOf("_")));
    var ys = parseInt(node1.substring(node1.indexOf("_")+1));
    var xe = parseInt(node2.substring(0,node2.indexOf("_")));
    var ye = parseInt(node2.substring(node2.indexOf("_")+1));
	var dist = Math.sqrt(Math.pow((xe-xs),2)+Math.pow((ye-ys),2));
	
	if (window.print_debug) {
		console.log("	return:",dist);
    }
	return dist;
}

function preDownloadNet(startpoint) {
	if (window.print_debug) {
		console.log("PreDownloadNet:",startpoint);
	}
	
	if (window.nettilesdownloaded.length > window.maxnetsize) {
		window.nettilesdownloaded = [];
		window.completenet = {};
	}
	
	var x_start = parseInt(startpoint.substring(0,startpoint.indexOf("_")).substring(0,2));
	var y_start = parseInt(startpoint.substring(startpoint.indexOf("_")+1).substring(0,3));
	
	var x_min = x_start-1;
	var y_min = y_start-1;
	var x_max = x_start+1;
	var y_max = y_start+1;
	
	for(var x=x_min; x<=x_max; x++){
		for(var y=y_min; y<=y_max; y++){
			var tilename = x + "_" + y;
			downloadNetTile(tilename, function(){
				if (window.print_debug) {
					console.log("	Done with tile");
				}
			});
		}
	}
}

function getClosestNode(x_wgs,y_wgs,searchradius,radiuslimit,prefeatures,prefeaturetiles,cb) {
	if (window.print_debug) {
		console.log("GetClosestNode:",x_wgs,y_wgs);
	}
	
	var point_sweref_yx = proj4(window.wgs84def,window.sweref99def,[y_wgs,x_wgs]);
	
	var x = parseInt(point_sweref_yx[0].toString().substr(0,3));
	var y = parseInt(point_sweref_yx[1].toString().substr(0,4));
	
	var x_max = x+searchradius;
	var y_max = y+searchradius;
	var x_min = x-searchradius;
	var y_min = y-searchradius;
	
	var totaltiles = (x_max-x_min+1)*(y_max-y_min+1);
	var donetiles = 0;
	var completenodes = {name:"completenodes",type:"FeatureCollection",features:prefeatures};
	var foundnode = false;
	
	for(var x=x_min; x<=x_max; x++){
		for(var y=y_min; y<=y_max; y++){
			var filename = x + "_" + y;
			
			if (prefeaturetiles.indexOf(filename) == -1){
				var url = this.static_files_url + "/nodes/" + filename + ".js";
				$.getScript(url)
				.done(function(data, textStatus, jqxhr) {
					if (window.print_debug) {
						console.log("	Tile succeeded");
					}
					
					for (nodeFeat in nodes.features) {
						completenodes.features.push(nodes.features[nodeFeat]);
					}
					prefeaturetiles.push(filename);
					donetiles++;
					foundnode = true;
					nodeTilesDownloaded(completenodes,x_wgs,y_wgs,searchradius,cb);
				})
				.fail(function(jqxhr, settings, exception) {
					if (window.print_debug) {
						console.log("	Tile failed");
					}
					
					prefeaturetiles.push(filename);
					donetiles++;
					nodeTilesDownloaded(completenodes,x_wgs,y_wgs,searchradius,cb);
				});
			} else {
				donetiles++
				nodeTilesDownloaded(completenodes,x_wgs,y_wgs,searchradius,cb);
			}				
		}
	}
	
	function nodeTilesDownloaded(completenodes,x_wgs,y_wgs,searchradius,cb) {
		if (window.print_debug) {
			console.log("	Done with",donetiles,"of",totaltiles,"tiles");
		}
		
		if(donetiles >= totaltiles) {
			if (!foundnode) {
				if (window.print_debug) {
					console.log("	Failed to get node at radius",searchradius,"( of",radiuslimit,")");
				}
				if (searchradius+3 <= radiuslimit){
					getClosestNode(x_wgs,y_wgs,searchradius+3,radiuslimit,completenodes.features,prefeaturetiles,cb);
				} else {
					if (window.print_debug) {
						console.log("	Failed to get node");
					}
					cb([]);
				}
			} else {
				var gj = L.geoJson(completenodes);
				var nearest = leafletKnn(gj).nearest(L.latLng(x_wgs,y_wgs), 1);
				var closestnode = [nearest[0].layer.feature.properties.id, nearest[0].lat, nearest[0].lon];
				
				if (window.print_debug) {
					console.log("	Callback:",closestnode);
				}
				cb(closestnode);
			}
		}
	}
}

function addStartToRoute(e) {
	if (window.print_debug) {
		console.log("AddStartToRoute");
	}
	
	window.busy = true;
	window.totalroutelength = 0;
	setHelpText("time","Laddar punkt");	
	
	getClosestNode(e.latlng.lat, e.latlng.lng, 1, 99, [], [], function([startpoint,x,y]) {
		window.busy = false;
		if (window.canceled) {
			window.canceled = false;
		} else {
			window.startpoint = startpoint;
			window.waypoints = [startpoint];
			
			var startpointmarker = L.marker([x, y], {icon: starticon});
			addMapMarker("startpoint", startpointmarker);
			
			window.state = "route-addwaypoint";
			window.route_buttons_enabled = true;
			
			setHelpText("info-sign","Lägg till punkt");
			preDownloadNet(startpoint);
		}
	});
}

function addWayPointToRoute(e) {
	if (window.print_debug) {
		console.log("AddWayPointToRoute");
	}
	
	window.busy = true;
	setHelpText("time", "Laddar punkt", function(){
		getClosestNode(e.latlng.lat, e.latlng.lng, 1, 99, [], [], function([endpoint,x,y]) {
			if (window.canceled) {
				window.canceled = false;
			} else {
				var absdist = getAbsDist(window.startpoint,endpoint);
				if (absdist < 75000) {
					var searchradius = 1;
				} else if (absdist < 150000) {
					var searchradius = 2;
				} else {
					var searchradius = 3;
				}
				if (absdist > window.maxroutedist) {
					window.busy = false;
					showAlertMessage("För lång sträcka!");
					setHelpText("info-sign","Lägg till punkt");
				} else {
					setHelpText("time","Laddar vägnät", function(){
						window.endpoint = endpoint;
						
						var waypoint_marker = L.marker([x, y], {icon: waypointicon});
						var endpoint_marker = L.marker([x, y], {icon: endicon});
						
						removeMapMarker("totalnavlength","lastmarker");
						removeMapMarker("endpoint","lastmarker");
								
						addMapMarker("waypoint", waypoint_marker);
						addMapMarker("endpoint", endpoint_marker);
						
						if (window.nettilesdownloaded.length > window.maxnetsize) {
							window.nettilesdownloaded = [];
							window.completenet = {};
						}
						
						findRoute(window.startpoint, window.endpoint, searchradius, function(coords,routelength){
							if (coords) {
								if (window.print_debug) {
									console.log("	Routelength:", routelength);
								}
								
								var line = L.polyline([coords], { className: 'route-line' });
								
								var length_marker = L.marker(new L.LatLng(coords[Math.round(coords.length/2)][0], coords[Math.round(coords.length/2)][1]), {
									icon: L.divIcon({
										className: 'route-length-icon',
										iconSize: null,
										iconAnchor: [20,10],
										html: Math.round(routelength/100)/10 + ' km'
										})
									});
								
								window.totalroutelength += routelength;
								var total_length_marker = L.marker(new L.LatLng(coords[coords.length-1][0], coords[coords.length-1][1]), {
									icon: L.divIcon({
										className: "",
										iconSize: null,
										iconAnchor: [26,43],
										html: '<span class="total-route-length-icon-container"><div class="total-route-length-icon">' + Math.round(window.totalroutelength/100)/10 + ' km' + '</div><div class="total-route-length-icon-arrow"></div></span>',
										})
									});
								
								addMapMarker("navline", line);
								addMapMarker("navlength", length_marker);
								addMapMarker("totalnavlength", total_length_marker);
								
								var zoomlevel = map.getZoom();							
								if (zoomlevel <= 9) {
									for (var i=0; i<window.mapmarkers.length; i++) {
                            			window.mapmarkers[i][decideMapMarkerGroup("navlength")].remove();
                            		}
								}
								
								window.waypoints.push(window.endpoint);
								window.startpoint = window.endpoint;
								
								window.busy = false;
								setHelpText("info-sign","Lägg till punkt");
								
								window.toolbar_buttons_enabled = true;
								document.getElementById("toolbar-undo").classList.remove('button-disabled');
								document.getElementById("toolbar-undo").classList.add('button');
								document.getElementById("toolbar-done").classList.remove('button-disabled');
								document.getElementById("toolbar-done").classList.add('button');
							} else {
							    removeMapMarker("endpoint","lastmarker");
							    removeMapMarker("waypoint","lastmarker");
							    
								window.busy = false;
								setHelpText("info-sign","Ingen rutt hittad!");
								
								window.setTimeout(function(){
                                	setHelpText("info-sign","Lägg till punkt");
                                },2000);
							}
						});
					});
				}
			}
		});
	});
}

function downloadNetTile(tilename, cb) {
	if (window.nettilesdownloaded.indexOf(tilename) == -1) {
		var url = this.static_files_url + "/nets_compressed/" + tilename + ".js";
		$.get(url, function(data){},"text")
		.done(function(data, textStatus, jqxhr) {
			window.nettilesdownloaded.push(tilename);
			
			var net = JSON.parse(LZString.decompressFromBase64(data));
			for (nodeKey in net) {
				window.completenet[nodeKey] = net[nodeKey];
			}
			cb();
		})
		.fail(function(jqxhr, settings, exception) {
			window.nettilesdownloaded.push(tilename);
			if (window.print_debug) {
				console.log("	Failed:", exception);
			}
			cb();
		});
	} else {
		if (window.print_debug) {
			console.log("	Already in completenet:", tilename);
		}
		cb();
	}
}

function findRoute(startpoint, endpoint, searchradius, cb) {
	if (window.print_debug) {
		console.log("FindRoute from",startpoint, "to", endpoint);
	}
	
    var x_start = startpoint.substring(0,startpoint.indexOf("_")).substring(0,2);
	var y_start = startpoint.substring(startpoint.indexOf("_")+1).substring(0,3);
	var x_end = endpoint.substring(0,startpoint.indexOf("_")).substring(0,2);
	var y_end = endpoint.substring(startpoint.indexOf("_")+1).substring(0,3);
	
	var x_min = Math.min(x_start,x_end)-searchradius;
	var y_min = Math.min(y_start,y_end)-searchradius;
	var x_max = Math.max(x_start,x_end)+searchradius;
	var y_max = Math.max(y_start,y_end)+searchradius;
	
	var totaltiles = (x_max-x_min+1)*(y_max-y_min+1);
	var donetiles = 0;
	
	if (window.print_debug) {
		console.log("	Total tiles:", totaltiles);
	}
	
	for(var x=x_min; x<=x_max; x++){
		for(var y=y_min; y<=y_max; y++){
			/*
			var coords_xy_sweref = [[x*10000,y*10000],[(x+1)*10000,y*10000],[(x+1)*10000,(y+1)*10000],[x*10000,(y+1)*10000],[x*10000,y*10000]];
			var coords_yx_wgs = coords_xy_sweref.map(item => {
					var coords_xy_wgs = proj4(window.sweref99def,window.wgs84def,[item[0],item[1]]);
					return [coords_xy_wgs[1],coords_xy_wgs[0]];
				});
				
				L.polyline(coords_yx_wgs, {style:{"color": "#f00"}}).addTo(window.mapmarkers[window.mapmarkers.length-1]);
			*/
			var tilename = x + "_" + y;
			downloadNetTile(tilename, function(){
				donetiles++;
				netDownloaded(searchradius);
			});
		}
	}
	
	function netDownloaded(searchradius) {
		if (window.print_debug) {
			console.log("	Done with",donetiles,"of",totaltiles,"tiles");
		}
		if(donetiles >= totaltiles) {
			setHelpText("time", "Beräknar rutt", function(){
				if (window.print_debug) {
					console.log("	Complete net size:", countProperties(window.completenet));
				}
				var map = {};
				for (nodeKey in window.completenet) {
					map[nodeKey] = {};
					for(endKey in window.completenet[nodeKey]) {
						var rank = parseInt(window.completenet[nodeKey][endKey].r);
						if (rank == 1){
							var weight = 1;
						} else if (rank == 2){
							var weight = 1 + 0.25*this.routefactor;
						} else if (rank == 3){
							var weight = 1 + 1*this.routefactor;
						} else if (rank == 4){
							var weight = 1 + 4*this.routefactor;
						} else if (rank == 5){
							var weight = 2 + 18*this.routefactor;
						} else if (rank == 99){
							var weight = 1 + 4*this.routefactor;
						} else {
							weight = 1 + 99*this.routefactor;
						}
						map[nodeKey][window.completenet[nodeKey][endKey].e] = parseInt(window.completenet[nodeKey][endKey].l)*weight;
					}
				}
				if (window.print_debug) {
					console.log("	Map builded");
				}
				
				var graph = new Graph(map);
				var sp = graph.grid[startpoint];
				var ep = graph.grid[endpoint];
				
				var avoidnodes = [];
				
				var result = astar.search(graph, sp, ep, null, avoidnodes);
				
				if (result.length > 0) {
					if (window.print_debug) {
						console.log("	Path found:",result);
					}
					
					var routelength = 0;
					var resultarray = [{"node":window.startpoint, "links":window.completenet[window.startpoint]}];
					if (window.routes[window.routes.length-1].net.length == 0) {
					    window.routes[window.routes.length-1].nodes.push(window.startpoint);
						window.routes[window.routes.length-1].net.push({"node":window.startpoint, "links":window.completenet[window.startpoint]});
					}
					var coords_xy_sweref = [window.startpoint];
					
					for (var e=0; e<result.length; e++){
						var nodename = result[e].name;
						resultarray.push({"node":nodename, "links":window.completenet[nodename]});
						coords_xy_sweref.push(nodename);
						window.routes[window.routes.length-1].nodes.push(nodename);
						window.routes[window.routes.length-1].net.push({"node":nodename, "links":window.completenet[nodename]});
					}
					
					for (var i=0; i<resultarray.length-1; i++){
						for (var j=0; j<resultarray[i].links.length; j++){
							if (resultarray[i].links[j].e == resultarray[i+1].node) {
								routelength += resultarray[i].links[j].l;
								break;
							}
						}
					}
					
					var coords_yx_wgs = coords_xy_sweref.map(item => {
						var coords_xy_wgs = proj4(window.sweref99def,window.wgs84def,[parseInt(item.substring(0,item.indexOf("_"))),parseInt(item.substring(item.indexOf("_")+1))]);
						return [coords_xy_wgs[1],coords_xy_wgs[0]];
					});
					
					cb(coords_yx_wgs, routelength);
				} else {
					if (window.print_debug) {
						console.log("	No result!");
					}
					
					if (searchradius < 4) {
						setHelpText("time","Laddar vägnät", function(){
							findRoute(startpoint, endpoint, searchradius+1, cb);
						});
					} else {
						cb();
					}
				}
			});
		}
	}
}

function doneRouting() {
	for (var i=0; i<window.mapmarkers.length; i++) {
		
		var resultarray = window.routes[i].net;
		if (resultarray.length > 0) {
			
			var routelength = 0;
			var sumrank = 0;
			
			for (var k=0; k<resultarray.length-1; k++){
				for (var j=0; j<resultarray[k].links.length; j++){
					if (resultarray[k].links[j].e == resultarray[k+1].node) {
						routelength += resultarray[k].links[j].l;
						sumrank += resultarray[k].links[j].l*resultarray[k].links[j].r;
						
						break;
					}
				}
			}
			
			var avgrank = sumrank/routelength;
			
		} else {
			var routelength = window.routes[i].routelength;
			var avgrank = window.routes[i].avgrank;
		}
		
		routelength = Math.round(routelength/100)/10;
		avgrank = Math.round(avgrank*10)/10;
		
		/*
		for (var j=0; j<window.mapmarkers[i].length; j++) {
			var fg = window.mapmarkers[i][j];
			var exportbutton = "<div onclick='openExportMenu(" + i + ")' class='button export-route-from-popup-button' id='export-route-from-popup-button-" + i.toString() + "'>EXPORT</div>"
			var popupcontent = "<b>Längd:</b> " + routelength + " km<br /><b>Medelnivå:</b> " + avgrank + "<br />" + exportbutton;
			fg.bindPopup(popupcontent, {
				className: 'route-popup'
			});
		}*/
	}
	
	resetState();
}

function undoRouting() {
    
    removeMapMarker("navline","lastmarker");
    removeMapMarker("navlength","lastmarker");
    removeMapMarker("totalnavlength","lastmarker");
    removeMapMarker("waypoint","lastmarker");
    removeMapMarker("endpoint","lastmarker");
    
	window.waypoints.pop();
    window.startpoint = window.waypoints[window.waypoints.length-1];
    
    var last = window.routes.length-1;
    var l = window.routes[last].nodes.length;
    for (var i=l-1; i>0; i--) {
        if (window.routes[last].nodes[window.routes[last].nodes.length-1] == window.startpoint) {
            break;
        }
        window.routes[last].nodes.pop();
        window.routes[last].net.pop();
    }
    
    var resultarray = window.routes[last].net;
	
	var routelength = 0;
	
	if (resultarray.length > 0) {
		for (var k=0; k<resultarray.length-1; k++){
			for (var j=0; j<resultarray[k].links.length; j++){
				if (resultarray[k].links[j].e == resultarray[k+1].node) {
					routelength += resultarray[k].links[j].l;
					break;
				}
			}
		}
	}
	window.totalroutelength = routelength;
	
	if (window.waypoints.length > 1) {
    	var coords_xy_wgs = proj4(window.sweref99def,window.wgs84def,[parseInt(window.startpoint.substring(0,window.startpoint.indexOf("_"))),parseInt(window.startpoint.substring(window.startpoint.indexOf("_")+1))]);
    	
        var endpoint_marker = L.marker(new L.LatLng(coords_xy_wgs[1],coords_xy_wgs[0]), {icon: endicon});
        var total_nav_length_marker = L.marker(new L.LatLng(coords_xy_wgs[1],coords_xy_wgs[0]), {
    		icon: L.divIcon({
    			className: "",
    			iconSize: null,
    			iconAnchor: [26,43],
    			html: '<span class="total-route-length-icon-container"><div class="total-route-length-icon">' + Math.round(window.totalroutelength/100)/10 + ' km' + '</div><div class="total-route-length-icon-arrow"></div></span>',
    			})
    		});
    	addMapMarker("endpoint", endpoint_marker);
    	addMapMarker("totalnavlength", total_nav_length_marker);
	}
	
	if (window.waypoints.length <= 1) {
	    this.toolbar_buttons_enabled = false;
    	document.getElementById("toolbar-undo").classList.add('button-disabled');
    	document.getElementById("toolbar-undo").classList.remove('button');
    	document.getElementById("toolbar-done").classList.add('button-disabled');
    	document.getElementById("toolbar-done").classList.remove('button');
	}
}

// ROUND FINDING

function planRound(x_click, y_click, goaldist) {
	if (window.print_debug) {
		console.log("PlanRound");
	}
	
	window.busy = true;
	window.totalroundlength = 0;
	document.getElementById("map").style.removeProperty("cursor");
	
	setHelpText("time","Laddar punkt", function() {	
		
		getClosestNode(x_click, y_click, 1, 99, [], [], function([startpoint,x,y]) {
			if (window.canceled) {
				window.canceled = false;
			} else {
				window.startpoint = startpoint;
				var startpoint_marker = L.marker([x, y], {icon: starticon});
				addMapMarker("startpoint",startpoint_marker);
				
				window.route_buttons_enabled = true;
				
				setHelpText("time", "Laddar vägnät", function(){
					
					var helppoints = [];
					var helpnodes = [];
					
					var helpdist1 = 0.0000014*goaldist;
					var helpdist2 = 1.25*helpdist1;
					
					helppoints.push([x,y+helpdist1*1.9*1.3]);
					helppoints.push([x,y+helpdist2*1.9*1.3]);
					helppoints.push([x+helpdist1/2,y+helpdist1*1.9]);
					helppoints.push([x+helpdist2/2,y+helpdist2*1.9]);
					helppoints.push([x+helpdist1,y+helpdist1*1.9]);
					helppoints.push([x+helpdist2,y+helpdist2*1.9]);
					helppoints.push([x+helpdist1,y+helpdist1*1.9/2]);
					helppoints.push([x+helpdist2,y+helpdist2*1.9/2]);
					helppoints.push([x+helpdist1*1.3,y]);
					helppoints.push([x+helpdist2*1.3,y]);
					helppoints.push([x+helpdist1,y-helpdist1*1.9/2]);
					helppoints.push([x+helpdist2,y-helpdist2*1.9/2]);
					helppoints.push([x+helpdist1,y-helpdist1*1.9]);
					helppoints.push([x+helpdist2,y-helpdist2*1.9]);
					helppoints.push([x+helpdist1/2,y-helpdist1*1.9]);
					helppoints.push([x+helpdist2/2,y-helpdist2*1.9]);
					helppoints.push([x,y-helpdist1*1.9*1.3]);
					helppoints.push([x,y-helpdist2*1.9*1.3]);
					helppoints.push([x-helpdist1/2,y-helpdist1*1.9]);
					helppoints.push([x-helpdist2/2,y-helpdist2*1.9]);
					helppoints.push([x-helpdist1,y-helpdist1*1.9]);
					helppoints.push([x-helpdist2,y-helpdist2*1.9]);
					helppoints.push([x-helpdist1,y-helpdist1*1.9/2]);
					helppoints.push([x-helpdist2,y-helpdist2*1.9/2]);
					helppoints.push([x-helpdist1*1.3,y]);
					helppoints.push([x-helpdist2*1.3,y]);
					helppoints.push([x-helpdist1,y+helpdist1*1.9/2]);
					helppoints.push([x-helpdist2,y+helpdist2*1.9/2]);
					helppoints.push([x-helpdist1,y+helpdist1*1.9]);
					helppoints.push([x-helpdist2,y+helpdist2*1.9]);
					helppoints.push([x-helpdist1/2,y+helpdist1*1.9]);
					helppoints.push([x-helpdist2/2,y+helpdist2*1.9]);
					
					var donepoints = 0;
					var totalpoints = helppoints.length;
					
					for (var i=0; i<helppoints.length; i++) {
						getClosestNode(helppoints[i][0], helppoints[i][1], 1, 5, [], [], function([nodename,x,y]){
							if (nodename) {
								helpnodes.push(nodename);
								donepoints++;
								doneWithPoint();
							} else {
								donepoints++;
								doneWithPoint();
							}
						});
					}
					
					function doneWithPoint() {
						if (window.print_debug) {
							console.log("	Done with",donepoints,"of",totalpoints,"points");
						}
						
						if(donepoints >= totalpoints) {
							if (window.canceled) {
								window.canceled = false;
							} else {
								window.candidateWaypoints = [];
								helpnodes = uniqueInArray(helpnodes);
								
								if (helpnodes.length < 2) {
									if (window.print_debug) {
										console.log("	Too few points, failed");
									}
								} else if (helpnodes.length < 7) {
									for(var i=0; i<helpnodes.length; i++) {
										for(var j=0; j<helpnodes.length; j++) {
											if (i != j) {
												window.candidateWaypoints.push([window.startpoint, helpnodes[i], helpnodes[j], window.startpoint]);
											}
										}
									}
								} else {
									for(var i=0; i<helpnodes.length; i++) {
										for(var j=0; j<helpnodes.length; j++) {
											//if(Math.abs(i-j) > 6 && Math.abs(i+helpnodes.length/2-j) > 6 && i+(helpnodes.length-j) > 6) {
											if ((getAbsDist(helpnodes[i],helpnodes[j]) < window.goaldist*0.25) && (getAbsDist(helpnodes[i],helpnodes[j]) > window.goaldist*0.1)) {
												window.candidateWaypoints.push([window.startpoint, helpnodes[i], helpnodes[j], window.startpoint]);
											}
										}
									}
								}
								if (window.print_debug) {
									console.log(window.candidateWaypoints);
									console.log("No of points:", countProperties(window.candidateWaypoints));
								}
								downloadTilesForRound(helpnodes);
							}
						}
					}
				});
			}
		});
	});
}

function downloadTilesForRound(helpnodes) {
	if (window.print_debug) {
		console.log("DownloadTilesForRound", helpnodes);
	}
	
	window.nettilesdownloaded = [];
	window.completenet = {};
	
	var x_max = window.startpoint.substring(0,window.startpoint.indexOf("_")).substring(0,2);
	var x_min = x_max;
	var y_max = window.startpoint.substring(window.startpoint.indexOf("_")+1).substring(0,3);
	var y_min = y_max;
	
	for (var i=0; i<helpnodes.length; i++) {
		var x = helpnodes[i].substring(0,helpnodes[i].indexOf("_")).substring(0,2);
		var y = helpnodes[i].substring(helpnodes[i].indexOf("_")+1).substring(0,3);
		if(x > x_max){x_max = x};
		if(x < x_min){x_min = x};
		if(y > y_max){y_max = y};
		if(y < y_min){y_min = y};
	}
	
	x_max++;
	x_min--;
	y_max++;
	y_min--;
	
	var totaltiles = (x_max-x_min+1)*(y_max-y_min+1);
	var donetiles = 0;
	
	if (window.print_debug) {
		console.log("	Total tiles:", totaltiles);
	}
	
	for(var x=x_min; x<=x_max; x++){
		for(var y=y_min; y<=y_max; y++){
			var tilename = x + "_" + y;
			downloadNetTile(tilename, function(){
				donetiles++;
				netDownloaded();
			});
		}
	}
	
	function netDownloaded(searchradius) {
		if (window.print_debug) {
			console.log("	Done with",donetiles,"of",totaltiles,"tiles");
		}
		if(donetiles >= totaltiles) {
			setHelpText("time", "Beräknar rundor (0%)", function(){
				if (window.print_debug) {
					console.log("	Complete net size:", countProperties(window.completenet));
				}
				var map = {};
				for (nodeKey in window.completenet) {
					map[nodeKey] = {};
					for(endKey in window.completenet[nodeKey]) {
						var rank = parseInt(window.completenet[nodeKey][endKey].r);
						if (rank == 1){
							var weight = 1;
						} else if (rank == 2){
							var weight = 1.25;
						} else if (rank == 3){
							var weight = 2;
						} else if (rank == 4){
							var weight = 5;
						} else if (rank == 5){
							var weight = 20;
						} else if (rank == 99){
							var weight = 5;
						} else {
							weight = 99;
						}
						map[nodeKey][window.completenet[nodeKey][endKey].e] = parseInt(window.completenet[nodeKey][endKey].l)*weight;
					}
				}
				if (window.print_debug) {
					console.log("	Map builded");
				}
				
				var graph = new Graph(map);
				setHelpText("time", "Beräknar rundor (1%)", function(){
					calcRounds(graph);
				});
			});
		}
	}
}

function calcRounds(graph) {
	
	var rounds = [];
	if (window.print_debug) {
	console.log("No of candidates:",window.candidateWaypoints.length);
	}
	
	var progress = 1;
	var nextRound = function(r, cb) {
		
		var failedround = false;
		var roundresult = [];
		var routelength = 0;
		var sumrank = 0;
		var sumlevel = 0;
		var sumdistaway = 0;
		
		var resultarray = [{"node":window.candidateWaypoints[r][0], "links":window.completenet[window.candidateWaypoints[r][0]]}];
		
		var middlesegmentresultarray = [];
		var coords_xy_sweref = [window.candidateWaypoints[r][0]];
		var avoidnodes = [];
		
		var resultparts = {"0":[], "1":[], "2":[]};
		
		var nextPart = function(l, cb) {
			var sp = graph.grid[window.candidateWaypoints[r][l]];
			var ep = graph.grid[window.candidateWaypoints[r][l+1]];
			
			if (l == 1) {
				var result = astar.search(graph, sp, ep, null, avoidnodes);
			} else {
				var route_key = sp.name + "__" + ep.name;
				var inv_route_key = ep.name + "__" + sp.name;
				if (window.savedroutes.hasOwnProperty(route_key)) {
					var result = window.savedroutes[route_key];
				} else {
					var result = astar.search(graph, sp, ep, null, []);
					var inv_result = result;
					window.savedroutes[route_key] = result;
					//window.savedroutes[inv_route_key] = inv_result.reverse();
				}
			}
			
			if (result.length > 0) {
				
				for (var e=0; e<result.length; e++){
					var nodename = result[e].name;
					resultparts[l].push({"node":nodename, "links":window.completenet[nodename]});
					avoidnodes.push(nodename);
				}
				
				if (l == 1) {
					for (var e=0; e<result.length; e++){
						middlesegmentresultarray.push({"node":result[e].name, "links":window.completenet[nodename]});
					}
				}
			
				if (l == 0) {
					nextPart(2,cb);
				} else if (l == 2) {
					nextPart(1,cb);
				} else {
					cb();
				}
			
			} else {
				failedround = true;
				cb();
			}			
		}
		
		nextPart(0, function(){
			
			for (var i=0; i<resultparts["0"].length; i++) {
				resultarray.push(resultparts["0"][i]);
				coords_xy_sweref.push(resultparts["0"][i].node);
			}
			for (var i=0; i<resultparts["1"].length; i++) {
				resultarray.push(resultparts["1"][i]);
				coords_xy_sweref.push(resultparts["1"][i].node);
			}			
			for (var i=0; i<resultparts["2"].length; i++) {
				resultarray.push(resultparts["2"][i]);
				coords_xy_sweref.push(resultparts["2"][i].node);
			}
			
			for (var i=0; i<middlesegmentresultarray.length; i++){
				var absdist = getAbsDist(window.startpoint,middlesegmentresultarray[i].node);
				if (absdist < window.goaldist/25) {
					failedround = true;
					break;
				} else {
					sumdistaway += absdist;
				}
			}

			if (!failedround) {
				for (var i=0; i<resultarray.length-1; i++){
					for (var j=0; j<resultarray[i].links.length; j++){
						if (resultarray[i].links[j].e == resultarray[i+1].node) {
							routelength += resultarray[i].links[j].l;
							
							var rank = resultarray[i].links[j].r;
							if (rank == 1){
								var weight = 1;
							} else if (rank == 2){
								var weight = 2;
							} else if (rank == 3){
								var weight = 3;
							} else if (rank == 4){
								var weight = 10;
							} else if (rank == 5){
								var weight = 100;
							} else if (rank == 99){
								var weight = 1;
							} else {
								weight = 99;
							}
							sumrank += resultarray[i].links[j].l*weight;
							sumlevel += resultarray[i].links[j].l*rank;
							
							break;
						}
					}
				}
				
				var avgrank = sumrank/routelength;
				var avglevel = sumlevel/routelength;
				var avgdistaway = sumdistaway/middlesegmentresultarray.length;
				
				var coords_yx_wgs = coords_xy_sweref.map(item => {
					var coords_xy_wgs = proj4(window.sweref99def,window.wgs84def,[parseInt(item.substring(0,item.indexOf("_"))),parseInt(item.substring(item.indexOf("_")+1))]);
					return [coords_xy_wgs[1],coords_xy_wgs[0]];
				});
				
				rounds.push({'coords':coords_yx_wgs, 'avgrank':avgrank, 'avglevel':avglevel, 'routelength':routelength, 'avgdistaway':avgdistaway});
			}
			
			if (window.canceled) {
				window.canceled = false;
			} else {
				if (r/window.candidateWaypoints.length*99 > progress) {
					progress = progress+1;
					setHelpText("time", "Beräknar rundor (" + progress + "%)", function() {
						r++;
						if (r < window.candidateWaypoints.length) {
							nextRound(r,cb);
						} else {
							cb();
						}
						
					});
				} else {
					r++;
					if (r < window.candidateWaypoints.length) {
						nextRound(r,cb);
					} else {
						cb();
					}
					
				}
			}
		});
	}
	nextRound(0, function() {
		setHelpText("time", "Beräknar rundor (100%)", function(){
			decideRound(rounds, function(success, bestround){
				if (success) {
					drawRound(bestround, function() {
						panToRound(bestround, function() {
							window.busy = false;
							doneRouting();
						});
					});
				} else {
						showAlertMessage("Inga bra rundor hittade!");
						window.busy = false;
						cancelTask();	
				}
			});
		});
	});
}

function decideRound(rounds, cb) {
	
	if (rounds.length>0) {
		function calcCost(round){
			return 0.000003*Math.pow(Math.abs(window.goaldist - round.routelength),2) + 100*Math.pow(round.avgrank-1,2) - 0.000001*Math.pow(round.avgdistaway,2);
		}
		
		var min_cost = calcCost(rounds[0]);
		var bestround = rounds[0];
		
		for (var i=1; i<rounds.length; i++) {
			var cost = calcCost(rounds[i]);
			if (window.print_debug) {
				console.log("	Round:",i,"Length:",rounds[i].routelength,"Cost:",cost,"(",0.000004*Math.pow(Math.abs(window.goaldist - rounds[i].routelength),2),"+",100*Math.pow(rounds[i].avgrank-1,2),"-",0.000001*Math.pow(rounds[i].avgdistaway,2),")");
			}
			if (cost < min_cost) {
				min_cost = cost;
				bestround = rounds[i];
				if (window.print_debug) {
					console.log("Best so far!");
				}
			}
		}
		if (min_cost > 2500) {
			if (window.print_debug) {
				console.log("	Too bad rounds. Bestround:",bestround);
			}
			cb(false);
		} else {
			if (window.print_debug) {
				console.log("	Best round:",bestround);
			}
			window.routes[window.routes.length-1].routelength = bestround.routelength;
			window.routes[window.routes.length-1].avgrank = bestround.avglevel;
			cb(true, bestround);	
		}
	} else {
		if (window.print_debug) {
			console.log("	No rounds found");
		}
		cb(false);
	}
}

function drawRound(round, cb) {
	var coords = round.coords;
	var routelength = round.routelength;
	
	if (window.print_debug) {
		console.log("	Routelength:", routelength);
	}
	
	var nav_line = L.polyline([coords], { className: "route-line" });
	var nav_length_marker = L.marker(new L.LatLng(coords[Math.round(coords.length/2)][0], coords[Math.round(coords.length/2)][1]), {
		icon: L.divIcon({
			className: "",
			iconSize: null,
			iconAnchor: [26,38],
			html: '<span class="total-route-length-icon-container"><div class="total-route-length-icon">' + Math.round(routelength/100)/10 + ' km' + '</div><div class="total-route-length-icon-arrow"></div></span>',
			})
		});
	addMapMarker("navline",nav_line);
	addMapMarker("totalnavlength",nav_length_marker);
	
	cb();
}

function panToRound(round, cb) {
	var coords = round.coords;
	
	var x_coords = coords.map(function(coord){
		return coord[0];
	});
	var y_coords = coords.map(function(coord){
		return coord[1];
	});
	
	var x_max = x_coords.reduce(function(a, b) {
		return Math.max(a, b);
	}) + 0.02;
	var x_min = x_coords.reduce(function(a, b) {
		return Math.min(a, b);
	}) -0.02;
	var y_max = y_coords.reduce(function(a, b) {
		return Math.max(a, b);
	}) +0.01;
	var y_min = y_coords.reduce(function(a, b) {
		return Math.min(a, b);
	}) -0.01;
	
	map.flyToBounds([
		[x_min, y_min],
		[x_max, y_max]
	]);
	cb();
}

// SET UP MAP

var baseLayerUrl = "https://{s}.basemaps.cartocdn.com/light_nolabels/{z}/{x}/{y}@2x.png";
var baseLayerAttribution = "<a href='https://carto.com' target='_blank'>Carto</a>";

var labelLayerUrl = "https://{s}.basemaps.cartocdn.com/light_only_labels/{z}/{x}/{y}@2x.png";
var labelLayerAttribution = "";

var map = L.map('map', {
	center: [59.76, 15.51],
	zoom: 7,
	minZoom: 7,
	maxZoom: 13,
	tapTolerance: 30,
	zoomControl: false
});

var racerLayer = L.tileLayer(this.static_files_url + '/tiles/{z}/{x}/{y}.png', {
	tms: false,
	reuseTiles: true,
	detectRetina: true,
	maxNativeZoom: 12,
	attribution: '<a href="https://nvdb.se/sv" target="_blank">NVDB</a>',
	className: 'racer-layer'
}).addTo(map);

// Add different layers depending on device
var baseLayer;
var labelLayer;

if (isMobile()){
	baseLayer = L.tileLayer(baseLayerUrl, {
		opacity: 1.0,
		attribution: baseLayerAttribution
	});
	labelLayer = L.tileLayer(labelLayerUrl, {
		opacity: 1.0,
		attribution: labelLayerAttribution
	});
} else {
	baseLayer = L.tileLayer(baseLayerUrl, {
		opacity: 1.0,
		attribution: baseLayerAttribution
	});
	
	labelLayer = L.gridLayer.googleMutant({
		type: 'roadmap',
		styles: [
			{elementType: 'roads', stylers: [{visibility: 'off'}]},
			{elementType: 'labels', stylers: [{visibility: 'on'}]}
		]
	});
}

baseLayer.addTo(map);
baseLayer.bringToBack();
labelLayer.addTo(map);

L.control.zoom({position:'bottomright'}).addTo(map);

var legend = L.control({
    position: 'bottomleft'
});
legend.onAdd = function (map) {
    var div = L.DomUtil.create('div');
    div.className = 'legend';
    div.innerHTML = '<span class="legenditem legenditemtop level1">1</span><span class="legenditem level2">2</span><span class="legenditem level3">3</span><span class="legenditem level4">4</span><span class="legenditem legenditembottom level5">5</span>';
    return div;
};
legend.addTo(map);

var measurebutton = L.control({
    position: 'bottomright'
});
measurebutton.onAdd = function (map) {
    var div = L.DomUtil.create('div');
    L.DomEvent.disableClickPropagation(div);
    div.className = 'measure-button measure-button-nonactive leaflet-control leaflet-bar';
    div.id = 'measure-button';
    div.innerHTML = '<span><img src="../fig/rulericon.png" class="measure-button-image"></span>';
    return div;
};
measurebutton.addTo(map);

// MAP EVENTS

map.on('click', onMapClick);
map.on('dblclick', onMapDoubleClick);
map.on('zoomend', onMapZoomEnd);

