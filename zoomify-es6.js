/*******************************************************************************************
 * zoomify
 * Written by Craig Francis
 * Absolutely minimal version of GSIV to work with touch screens and very slow processors.
 *
 * Adapted and changed by Bormgruppe
********************************************************************************************/

/*global window, document, setTimeout, getComputedStyle */
/*jslint white: true */

import $ from 'jquery';
import 'hammerjs';

$.fn.zoomify = function(opt) {
    "use strict";

    function relMouseCoords(event){
        var coords = event_coords(event);
        var target = $(event.target || event.srcElement);

        return {
            x: coords[0] - target.offset().left,
            y: coords[1] - target.offset().top
        }
    }
    HTMLImageElement.prototype.relMouseCoords = relMouseCoords;

    //--------------------------------------------------
    // Variables

    var div_ref = null,
        div_half_width = null,
        div_half_height = null,
        div_width = null,
        div_height = null,
        img_ref = null,
        img_orig_width = null,
        img_orig_height = null,
        img_zoom_width = null,
        img_zoom_height = null,
        img_start_left = null,
        img_start_top = null,
        img_current_left = null,
        img_current_top = null,
        zoom_control_refs = {},
        zoom_level = 0,
        zoom_levels = [],
        zoom_level_count = [],
        origin = null,
        html_ref = null,
		last_pinch_distance = null;

    //--------------------------------------------------
    // IE9 Bug ... if loading an iframe which is then
    // moved in the DOM (as done in lightboxMe, line 51),
    // then IE looses the reference and decides to do
    // an early garbage collection:
    // http://stackoverflow.com/q/8389261

    if (typeof(Math) === 'undefined') {
        return false; // No need to window.reload, as IE9 will reload the page anyway.
    }

    //--------------------------------------------------
    // Zooming

    function image_zoom(change) {

        //--------------------------------------------------
        // Variables

        var new_zoom,
            new_zoom_width,
            new_zoom_height,
            ratio;

        //--------------------------------------------------
        // Zoom level

        new_zoom = (zoom_level + change);

        if (new_zoom >= zoom_level_count) {
            if (new_zoom > zoom_level_count) {
                return;
            }
			
            zoom_control_refs['in-on'].style.display = 'none';
            zoom_control_refs['in-off'].style.display = 'block';
        } else {
            zoom_control_refs['in-on'].style.display = 'block';
            zoom_control_refs['in-off'].style.display = 'none';
        }

        if (new_zoom <= 0) {
            if (new_zoom < 0) {
                return;
            }
			
            zoom_control_refs['out-on'].style.display = 'none';
            zoom_control_refs['out-off'].style.display = 'block';
        } else {
            zoom_control_refs['out-on'].style.display = 'block';
            zoom_control_refs['out-off'].style.display = 'none';
        }

        zoom_level = new_zoom;

        //--------------------------------------------------
        // New width

        new_zoom_width = zoom_levels[new_zoom];
        new_zoom_height = (zoom_levels[new_zoom] * (img_orig_height / img_orig_width));

        img_ref.width = new_zoom_width;
        img_ref.height = new_zoom_height;

        //--------------------------------------------------
        // Update position

        if (img_current_left === null) { // Position in the middle on page load
            img_current_left = (div_half_width - (new_zoom_width  / 2));
            img_current_top  = (div_half_height - (new_zoom_height / 2));
        } else {
            ratio = (new_zoom_width / img_zoom_width);

            img_current_left = (div_half_width - ((div_half_width - img_current_left) * ratio));
            img_current_top  = (div_half_height - ((div_half_height - img_current_top)  * ratio));
        }

        img_zoom_width = new_zoom_width;
        img_zoom_height = new_zoom_height;

        img_ref.style.left = img_current_left + 'px';
        img_ref.style.top  = img_current_top + 'px';

        image_move_update();
    }

    function image_zoom_in() {
        image_zoom(1);
    }

    function image_zoom_out() {
        image_zoom(-1);
    }

    function scroll_event(e) {

        //--------------------------------------------------
        // Event

        e = e || window.event;

        var wheelData = (e.detail ? e.detail * -1 : e.wheelDelta / 40);

        image_zoom(wheelData > 0 ? 1 : -1);

        //--------------------------------------------------
        // Prevent default

        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }

        return false;
    }

    //--------------------------------------------------
    // Movement

    function event_coords(e) {
        var coords = [];
        if (e.changedTouches && e.changedTouches.length) {
            coords[0] = e.changedTouches[0].pageX;
            coords[1] = e.changedTouches[0].pageY;
        } else {
            coords[0] = e.pageX;
            coords[1] = e.pageY;
        }
        return coords;
    }

    function image_move_update() {

        //--------------------------------------------------
        // Boundary check

        var max_left, max_top;

        var border = 50;
        if (opt && opt.hasOwnProperty('border')) {
            border = opt.border;
        }

        if (img_zoom_width > div_width) {
            max_left = div_width - border - img_zoom_width;

            if (img_current_left > border) {
                img_current_left = border;
            }
            if (img_current_left < max_left) {
                img_current_left = max_left;
            }
        } else {
            max_left = div_half_width - img_zoom_width;

            if (img_current_left > div_half_width) {
                img_current_left = div_half_width;
            }
            if (img_current_left < max_left) {
                img_current_left = max_left;
            }
        }

        if (img_zoom_height > div_height) {
            max_top = div_height - border - img_zoom_height;

            if (img_current_top > border) {
                img_current_top = border;
            }
            if (img_current_top < max_top) {
                img_current_top = max_top;
            }
        } else {
            max_top = div_half_height - img_zoom_height;

            if (img_current_top > div_half_height) {
                img_current_top = div_half_height;
            }
            if (img_current_top < max_top) {
                img_current_top = max_top;
            }
        }

        //--------------------------------------------------
        // Move

        img_ref.style.left = img_current_left + 'px';
        img_ref.style.top  = img_current_top + 'px';
    }

    function image_move_event(e) {

        //--------------------------------------------------
        // Calculations

        e = e || window.event;

        if (last_pinch_distance === null) {
            var currentPos = event_coords(e);

            img_current_left = (img_start_left + (currentPos[0] - origin[0]));
            img_current_top = (img_start_top + (currentPos[1] - origin[1]));

            image_move_update();
        }

        //--------------------------------------------------
        // Prevent default

        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false;
        }

        return false;
    }

    function image_click_event(e) {
        var coords = event_coords(e);
        var px = coords[0];
        var py = coords[1];

        if (started && Math.abs(startX - px) < 10 && Math.abs(startY - py) < 10) {
            var clickCoords = img_ref.relMouseCoords(e);

            var cx = clickCoords.x * img_orig_width / img_zoom_width;
            var cy = clickCoords.y * img_orig_height / img_zoom_height;

            $(img_ref).trigger('zoomify-click', { x: cx, y: cy });
        }

        started = false;
    }

    function image_move_start(e) {

        //--------------------------------------------------
        // Event

        e = e || window.event;

        if (!started) {
            var coords = event_coords(e);
            startX = coords[0];
            startY = coords[1];

            started = true;
        }

        if (e.preventDefault) {
            e.preventDefault();
        } else {
            e.returnValue = false; // IE: http://stackoverflow.com/questions/1000597/
        }

        //--------------------------------------------------
        // Add events

        // http://www.quirksmode.org/blog/archives/2010/02/the_touch_actio.html
        // http://www.quirksmode.org/m/tests/drag.html

        if (e.type === 'touchstart') {
            img_ref.onmousedown = null;
            img_ref.ontouchmove = image_move_event;
            img_ref.ontouchend = function(e) {
                image_click_event(e);

                img_ref.ontouchmove = null;
                img_ref.ontouchend = null;
            };
        } else {
            document.onmousemove = image_move_event;
            document.onmouseup = function(e) {
                image_click_event(e);

                document.onmousemove = null;
                document.onmouseup = null;
            };
        }

        //--------------------------------------------------
        // Record starting position

        img_start_left = img_current_left;
        img_start_top = img_current_top;

        origin = event_coords(e);
    }

    //--------------------------------------------------
    // Default styles for JS enabled version

    html_ref = document.getElementsByTagName('html');
    if (html_ref[0]) {
        html_ref[0].className = html_ref[0].className + ' js-enabled';
    }

    //--------------------------------------------------
    // On load

    div_ref = $(this)[0];
    img_ref = $(this).children('img')[0];

    if (div_ref && img_ref) {

        //--------------------------------------------------
        // Variables

        var div_border,
            div_style,
            div_width,
            div_height,
            width,
            height,
            button,
            buttons,
            name,
            len,
            k;

        //--------------------------------------------------
        // Wrapper size

        try {
            div_style = getComputedStyle(div_ref, '');
            div_border = div_style.getPropertyValue('border-top-width');
            div_width = div_style.getPropertyValue('width');
            div_height = div_style.getPropertyValue('height');
        } catch(e) {
            div_border = div_ref.currentStyle.borderWidth;
            div_width = div_ref.currentStyle.width;
            div_height = div_ref.currentStyle.height;
        }

        div_width = parseInt(div_width, 10);
        div_height = parseInt(div_height, 10);
        div_half_width = Math.round(div_width / 2);
        div_half_height = Math.round(div_height / 2);

        //--------------------------------------------------
        // Original size

        img_orig_width = img_ref.width;
        img_orig_height = img_ref.height;

        //--------------------------------------------------
        // Add zoom controls

        buttons = [{'t' : 'in', 's' : 'on'}, {'t' : 'in', 's' : 'off'}, {'t' : 'out', 's' : 'on'}, {'t' : 'out', 's' : 'off'}];

        for (k = 0, len = buttons.length; k < len; k = k + 1) {
            button = buttons[k];
            name = button.t + '-' + button.s;

            zoom_control_refs[name] = document.createElement('div');
            zoom_control_refs[name].className = 'zoom-control zoom-' + button.t + ' zoom-' + button.s;

            if (button.t === 'in') {
                if (button.s === 'on') {
                    zoom_control_refs[name].onmousedown = image_zoom_in; // onclick on iPhone seems to have a more pronounced delay
                }
            } else {
                if (button.s === 'on') {
                    zoom_control_refs[name].onmousedown = image_zoom_out;
                }
            }

            if (button.s === 'on') {
                try {
                    zoom_control_refs[name].style.cursor = 'pointer';
                } catch(err) {
                    zoom_control_refs[name].style.cursor = 'hand'; // Yes, even IE5 support
                }
            }

            div_ref.appendChild(zoom_control_refs[name]);
        }

        //--------------------------------------------------
        // Zoom levels

        //--------------------------------------------------
        // Defaults

        div_width = (div_half_width * 2);
        div_height = (div_half_height * 2);

        width = img_orig_width;
        height = img_orig_height;

        zoom_levels[zoom_levels.length] = width;

        while (width > div_width || height > div_height) {
            width = (width * 0.75);
            height = (height * 0.75);
            zoom_levels[zoom_levels.length] = Math.round(width);
        }

        zoom_levels.reverse(); // Yep IE5.0 does not support unshift... but I do wonder if a single reverse() is quicker than inserting at the beginning of the array.

        //--------------------------------------------------
        // Mobile phone, over zoom

        if (parseInt(div_border, 10) === 5) { // img width on webkit will return width before CSS is applied
            zoom_levels[zoom_levels.length] = Math.round(img_orig_width * 1.75);
            zoom_levels[zoom_levels.length] = Math.round(img_orig_width * 3);
        }

        //--------------------------------------------------
        // Set default

        zoom_level_count = (zoom_levels.length - 1);
        image_zoom(Math.round(zoom_level_count / 2));
        if (opt && opt.hasOwnProperty('startZoom')) {
            if (opt.startZoom === 'min') {
                image_zoom(0); //zoomed in
            } else if (opt.startZoom === 'max') {
                image_zoom(zoom_level_count);  //zoomed out
            }
        }

        //--------------------------------------------------
        // Make visible

        img_ref.style.visibility = 'visible';

        div_ref.className = div_ref.className + ' js-active';

        //--------------------------------------------------
        // Add mouse events

        var startX;
        var startY;
        var started = false;

        img_ref.onmousedown = image_move_start;
        img_ref.ontouchstart = image_move_start;

        if (div_ref.addEventListener) {
            div_ref.addEventListener('DOMMouseScroll', scroll_event, false);
            div_ref.addEventListener('mousewheel', scroll_event, false);
        } else if (div_ref.attachEvent) {
            div_ref.attachEvent('onmousewheel', scroll_event);
        }

        document.onkeyup = function(e) {
            var keyCode = (e ? e.which : window.event.keyCode);

            if (keyCode === 37 || keyCode === 39) { // left or right
                img_current_left = (img_current_left + (keyCode === 39 ? 50 : -50));
                image_move_update();
            } else if (keyCode === 38 || keyCode === 40) { // up or down
                img_current_top = (img_current_top + (keyCode === 40 ? 50 : -50));
                image_move_update();
            } else if (keyCode === 107 || keyCode === 187 || keyCode === 61) { // + or = (http://www.javascripter.net/faq/keycodes.htm)
                image_zoom_in();
            } else if (keyCode === 109 || keyCode === 189) { // - or _
                image_zoom_out();
            }
        };

        $(img_ref).on('mousemove', function(event) {
            var self = $(this);
            var rel = img_ref.relMouseCoords(event);

            var cx = rel.x * img_orig_width / img_zoom_width;
            var cy = rel.y * img_orig_height / img_zoom_height;

            var abs = event_coords(event);

            self.trigger('zoomify-mousemove', {
                absX: abs[0],
                absY: abs[1],
                relX: cx,
                relY: cy
            });
        });
		
        //--------------------------------------------------
        // Add Hammer.js events
		
        var hammertime = new Hammer(img_ref);
        hammertime.get('pinch').set({ enable: true });
		
		hammertime.on('pinchstart', function(event) {
			last_pinch_distance = event.distance;
		});
		
		hammertime.on('pinchend', function(event) {
			last_pinch_distance = null;
		});
		
		var ifPinchCallback = function(event, callback) {
			var newDistance = event.distance;
			
			if (Math.abs(last_pinch_distance - newDistance) > 10) { // zoom threshold
				callback(event);
				
				last_pinch_distance = newDistance;
			}
		};
		
		hammertime.on('pinchin', function(event) {
			ifPinchCallback(event, function(event) {
				image_zoom_out();
			});
		});
		
		hammertime.on('pinchout', function(event) {
			ifPinchCallback(event, function(event) {
				image_zoom_in();
			});
		});
    }
};