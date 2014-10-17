define(function(require) {

	var QuestionView = require('coreViews/questionView');
	var Adapt = require('coreJS/adapt');
    var Draggabilly = require('components/adapt-ppq/js/draggabilly');

    var PPQ = QuestionView.extend({

        $pins: undefined,
        $boundary: undefined,

        events: {
            "click .ppq-pinboard":"onClickPlacePin"
        },


        setupQuestion: function() {
            console.log('PPQ: setupQuestion');
            this.setLayout();
            this.listenTo(Adapt, 'device:changed', this.handleDeviceChanged);
            this.listenTo(Adapt, 'device:resize', this.handleDeviceResize);
        },
        setLayout: function() {
            console.log('PPQ: setLayout');
            //Setlayout for view. This is also called when device changes.
            if (Adapt.device.screenSize == "medium" || Adapt.device.screenSize == "large") {
                this.model.set({
                    _isDesktopLayout:true
                });
            } else if (Adapt.device.screenSize == "small") {
                this.model.set({
                    _isDesktopLayout:false
                });
            }
            
        },
        resetQuestion: function() {
            console.log('PPQ: resetQuestion');
            this.model.set({
                _isAtLeastOneCorrectSelection: false
            });

        },
        onQuestionRendered: function() {
            console.log('PPQ: onQuestionRendered');
            this.$el.imageready(_.bind(function() {
                this.setReadyStatus();
            }, this));
            this.$pins = this.$el.find('.ppq-pin');
            this.$boundary = this.$el.find('#ppq-boundary');
            this.$pins.each(_.bind(this.attachDragHandles, this));
            //do pin restore mode
        },


        attachDragHandles: function(index, item) {
            if (item._dragger !== undefined) return;
            item._dragger = new Draggabilly(item, {
                container: this.$boundary[0]
            });
            item._dragger.on("dragStart", _.bind(this.dragStart, this));
            item._dragger.on("dragEnd", _.bind(this.dragEnd, this));
        },
        dragStart: function(dragHandleInstance, event, pointer) {
            var $pin = $(dragHandleInstance.element);
            //dragging is done in pixel positioning
            this.changePinToPixelPositioningMode($pin, {
                top: pointer.pageY,
                left: pointer.pageX
            });
        },
        dragEnd: function(dragHandleInstance, event, pointer) {
            var $pin = $(dragHandleInstance.element);
            //restore percentage positioning
            this.calcPinPositionFromPagePosition($pin, {
                top: pointer.pageY,
                left: pointer.pageX
            });
        },



        handleDeviceChanged: function() {
            console.log('PPQ: handleDeviceChanged');
            this.setLayout();
            this.render();
        },
        handleDeviceResize: function() {
            console.log('PPQ: handleDeviceResize');
        },

        

        canSubmit: function() {
            console.log('PPQ: canSubmit');
            var $pin = this.$pins.filter(":not(.in-use):first");
            if ($pin.length === 0) return true;    
            return false;
        },
        storeUserAnswer: function() {
            console.log('PPQ: storeUserAnswer');
            var store = [];
            var dl = this.model.get("_isDesktopLayout");
            this.$pins.each(function (index, item) {
                var $pin = $(item);
                var px = {
                    top: parseInt($pin.attr("toppx")),
                    left: parseInt($pin.attr("leftpx"))  
                };
                var per = {
                    top: parseInt($pin.attr("topper")),
                    left: parseInt($pin.attr("leftper"))
                };
                store.push({
                    px: px,
                    per: per,
                    dl: dl
                });
            });
            this.model.set("_userAnswer", store);
        },
        isCorrect: function() {
            console.log('PPQ: isCorrect');
            
            var correctZones = this.model.get("_items");
            var isDesktopLayout = this.model.get("_isDesktopLayout");

            var correctCount = 0;

            this.$pins.each(function (index, item) {
                var $pin = $(item);
                var point = {
                    top: parseInt($pin.attr("pointtop")),
                    left: parseInt($pin.attr("pointleft"))
                };
                var isCorrect = false;
                _.each(correctZones, function(zone, index) {
                    var mediaZone;
                    switch (isDesktopLayout) {
                    case true:
                        mediaZone=zone.desktop;
                        break;
                    case false:
                        mediaZone=zone.mobile;
                        break;
                    }

                    if (point.left >= mediaZone.left &&
                        point.top >= mediaZone.top &&
                        point.left <= mediaZone.left+mediaZone.width &&
                        point.top <= mediaZone.top+mediaZone.height) {
                        zone._isCorrect = isCorrect = true;
                        $pin.attr("zone", index);
                        correctCount++;
                    }
                });
                if (!isCorrect) {
                    $pin.attr("zone", "-1");
                }
            });

            if (correctCount > 1) this.model.set('_isAtLeastOneCorrectSelection', true);
            var correct = (correctCount === this.$pins.length);


            return correct;

        },
        isPartlyCorrect: function() {
            console.log('PPQ: isPartlyCorrect');
            return this.model.get('_isAtLeastOneCorrectSelection');
        },
        showMarking: function() {
            console.log('PPQ: showMarking');
            var zones = this.model.get("_items");
            this.$pins.removeClass("item-correct").addClass("item-incorrect");
            _.each(zones, _.bind(function(zone, index) {
                if (zone._isCorrect) {
                    var $pin = this.$pins.filter("[zone='" + index + "']");
                    $pin.addClass("item-correct").removeClass("item-incorrect");
                }
            }, this));
        },
        hideCorrectAnswer: function() {
            console.log('PPQ: hideCorrectAnswer');
            var _userAnswer = this.model.get("_userAnswer");
            _.each(_userAnswer, _.bind(function(item, index) {
                $(this.$pins[index]).css({
                    top: item.per.top + "%",
                    left: item.per.left + "%"
                });
            }, this));
        },
        showCorrectAnswer: function() {
            console.log('PPQ: showCorrectAnswer');
            var correctZones = this.model.get("_items");
            var isDesktopLayout = this.model.get("_isDesktopLayout");

            var correctCount = 0;

            this.$pins.each(function (index, item) {
                var $pin = $(item);
                var zone = correctZones[index];
                var mediaZone;
                switch (isDesktopLayout) {
                case true:
                    mediaZone=zone.desktop;
                    break;
                case false:
                    mediaZone=zone.mobile;
                    break;
                }

                var boundaryDimensions = {
                    height: this.$boundary.height(),
                    width: this.$boundary.width()
                };

                var pinCenterOffset = {
                    left: $pin.width() / 2,
                    top: $pin.height()
                };

            });
        },





        onClickPlacePin: function(event) {
        	console.log('PPQ: onClickPlacePin');
            
            var $pin = this.$pins.filter(":not(.in-use):first");
            if ($pin.length === 0) return;

            var pagePoint = {
                left: event.pageX,
                top: event.pageY
            };
            //place as percentage positioning
            var pointAsPercent = this.calcPinPositionFromPagePosition($pin, pagePoint);

            $pin.addClass("in-use");
        },
        calcPinPositionFromPagePosition: function($pin, pagePoint) {
            /*
            *   point allocations are by mouse to page position,
            *   images are placed relative to boundary, 
            *   coversion happens here
            */
            var boundaryOffset = this.$boundary.offset();

            var boundaryDimensions = {
                height: this.$boundary.height(),
                width: this.$boundary.width()
            };

            var pinCenterOffset = {
                left: $pin.width() / 2,
                top: $pin.height()
            };

            //startPoint is used for dragstart/dragend mouse to image offsets
            var startPoint = {
                left: parseInt($pin.attr("leftstart")),
                top:  parseInt($pin.attr("topstart"))
            };
            if (!isNaN(startPoint.left) && !isNaN(startPoint.top)) {
                var pickupPoint = {
                    left: parseInt($pin.attr("leftpx")),
                    top: parseInt($pin.attr("toppx"))
                };
                pinCenterOffset.left -= pickupPoint.left - startPoint.left;
                pinCenterOffset.top -= pickupPoint.top - startPoint.top;
            }

            var pointAsPixel = {
                left: Math.round((pagePoint.left - boundaryOffset.left)),
                top:  Math.round((pagePoint.top - boundaryOffset.top))
            };

            var pointAsPercent = {
                left: Math.round((100 / boundaryDimensions.width) * pointAsPixel.left),
                top:  Math.round((100 / boundaryDimensions.height) * pointAsPixel.top)
            };

            var positionAsPixel = {
                left: Math.round((pagePoint.left - boundaryOffset.left - pinCenterOffset.left)),
                top:  Math.round((pagePoint.top - boundaryOffset.top - pinCenterOffset.top))
            };

            var positionAsPercent = {
                left: Math.round((100 / boundaryDimensions.width) * positionAsPixel.left),
                top:  Math.round((100 / boundaryDimensions.height) * positionAsPixel.top)
            };

            $pin.css({
                left: positionAsPercent.left + "%",
                top: positionAsPercent.top + "%"
            }).attr({
                //save percentage and pixel positions on element
                mode: "percent",
                leftpx: positionAsPixel.left,
                toppx: positionAsPixel.top,
                leftper: positionAsPercent.left,
                topper: positionAsPercent.top,
                pointleft: pointAsPercent.left,
                pointtop: pointAsPercent.top
            });

            return positionAsPercent;
        },
        changePinToPixelPositioningMode: function($pin, fromPoint) {
            var mode = $pin.attr("mode");
            var attr, css;
            var px;
            switch (mode) {
            case "percent":
                //convert element positioning to pixel format using the saved positions
                var px = {
                    top: parseInt($pin.attr("toppx")),
                    left: parseInt($pin.attr("leftpx"))  
                };
                var css = {
                    left: px.left + "px",
                    top: px.top + "px"
                };

                var boundaryOffset = this.$boundary.offset();

                var pinCenterOffset = {
                    left: $pin.width() / 2,
                    top: $pin.height()
                };

                //save start click point to element
                var startPointAsPixel = {
                    left: Math.round((fromPoint.left - boundaryOffset.left - pinCenterOffset.left)),
                    top:  Math.round((fromPoint.top - boundaryOffset.top - pinCenterOffset.top))
                };
                var attr = {
                    mode: "pixel",
                    topstart: startPointAsPixel.top,
                    leftstart: startPointAsPixel.left
                };

                $pin.css(css).attr(attr);
                break;
            }
        }

    });

    Adapt.register("ppq", PPQ);

    return PPQ;

});
