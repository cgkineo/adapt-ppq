define(function(require) {

	var QuestionView = require('coreViews/questionView');
	var Adapt = require('coreJS/adapt');
    var Draggabilly = require('components/adapt-ppq/js/draggabilly');

    var PPQ = QuestionView.extend({

        $pins: undefined,
        $boundary: undefined,

        events: {
            "click .ppq-pinboard":"onClickPlacePin",
            "touchstart .ppg-pinboard":"onTouchPlacePin"
        },


        setupQuestion: function() {
            //console.log('PPQ: setupQuestion');
            this.setLayout();
            this.listenTo(Adapt, 'device:changed', this.handleDeviceChanged);
            this.listenTo(Adapt, 'device:resize', this.handleDeviceResize);
        },
        setLayout: function() {
            //console.log('PPQ: setLayout');
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
            //console.log('PPQ: resetQuestion');
            this.model.set({
                _isAtLeastOneCorrectSelection: false
            });

        },
        onQuestionRendered: function() {
            //console.log('PPQ: onQuestionRendered');
            this.$el.imageready(_.bind(function() {
                this.setReadyStatus();
            }, this));
            this.$pins = this.$el.find('.ppq-pin');
            this.$boundary = this.$el.find('#ppq-boundary');
            if (this.model.get("_isSubmitted")) return;
            this.$pins.each(_.bind(this.attachDragHandles, this));
        },


        attachDragHandles: function(index, item) {
            if (item._dragger !== undefined) return;
            item._dragger = new Draggabilly(item, {
                container: this.$boundary[0]
            });
            item._dragger.on("dragStart", _.bind(this.dragStart, this));
            item._dragger.on("dragEnd", _.bind(this.dragEnd, this));
        },
        detachDragHandles: function(index, item) {
            if (item._dragger === undefined) return;
            item._dragger.disable();
            delete item._dragger;
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
            //console.log('PPQ: handleDeviceChanged');
            this.setLayout();
            this.render();
            this.$el.imageready(_.bind(function() {
                this.$boundary = this.$el.find("#ppq-boundary");
                this.$pins = this.$el.find('.ppq-pin');
                if (this.model.get("_isSubmitted")) {
                    //TODO: FINISH THIS
                    this.$pins.addClass("in-use");
                    var newAnswers = this.changeLayoutUserAnswer();
                    this.restoreAnswer(newAnswers);

                } else {
                    //TODO: RESET QUESTION
                }
            }, this));
            
        },
        handleDeviceResize: function() {
            //console.log('PPQ: handleDeviceResize');
        },

        

        canSubmit: function() {
            //console.log('PPQ: canSubmit');
            var $pin = this.$pins.filter(":not(.in-use):first");
            if ($pin.length === 0) return true;    
            return false;
        },
        storeUserAnswer: function() {
            //console.log('PPQ: storeUserAnswer');
            var store = [];
            var dl = this.model.get("_isDesktopLayout");
            this.$pins.each(function (index, item) {
                var $pin = $(item);
                var px = {
                    top: parseFloat($pin.attr("toppx")),
                    left: parseFloat($pin.attr("leftpx"))  
                };
                var per = {
                    top: parseFloat($pin.attr("topper")),
                    left: parseFloat($pin.attr("leftper"))
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
            //console.log('PPQ: isCorrect');

            this.$pins.each(_.bind(this.detachDragHandles, this));
            
            var correctZones = this.model.get("_items");
            var isDesktopLayout = this.model.get("_isDesktopLayout");

            var correctCount = 0;

            this.$pins.each(function (index, item) {
                var $pin = $(item);
                var point = {
                    top: parseFloat($pin.attr("pointtop")),
                    left: parseFloat($pin.attr("pointleft"))
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
            //console.log('PPQ: isPartlyCorrect');
            return this.model.get('_isAtLeastOneCorrectSelection');
        },
        showMarking: function() {
            //console.log('PPQ: showMarking');
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
            //console.log('PPQ: hideCorrectAnswer');
            this.model.set("_isCorrectAnswer", false);

            this.restoreUserAnswer();
        },
        showCorrectAnswer: function() {
            //console.log('PPQ: showCorrectAnswer');
            var correctZones = this.model.get("_items");
            var isDesktopLayout = this.model.get("_isDesktopLayout");

            this.model.set("_isCorrectAnswer", true);

            var correctCount = 0;

            this.$pins.each(_.bind(function (index, item) {
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

                var pinCenterOffsetPercent = {
                    left: (100/boundaryDimensions.width) * ($pin.width() / 2),
                    top: (100/boundaryDimensions.height) * ($pin.height())
                };

                var positionAsPercent = {
                    left: mediaZone.left + (mediaZone.width / 2) - pinCenterOffsetPercent.left,
                    top: mediaZone.top + (mediaZone.height / 2) - pinCenterOffsetPercent.top,
                };

                $pin.css({
                    left: positionAsPercent.left + "%",
                    top: positionAsPercent.top + "%",
                }).removeClass("item-incorrect").removeClass("item-correct").addClass( "item-correct" );

            }, this));
        },



        changeLayoutUserAnswer: function() {
            var _userAnswer = this.model.get("_userAnswer");
            var correctZones = this.model.get("_items");
            var isDesktopLayout = this.model.get("_isDesktopLayout");
            var isCorrectAnswer = this.model.get("_isCorrectAnswer");

            var newAnswers = [];
            _.each(_userAnswer, _.bind(function(item, index){
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

                var pinCenterOffsetPercent = {
                    marginLeft:  (100/boundaryDimensions.width) * ($(this.$pins[0]).width()),
                    left: (100/boundaryDimensions.width) * ($(this.$pins[0]).width() / 2),
                    top: (100/boundaryDimensions.height) * ($(this.$pins[0]).height())
                };

                var positionAsPercent;

                //if (index < correct) {
                if (correctZones[index]._isCorrect || isCorrectAnswer) {
                    //place correct pin inside area
                    positionAsPercent = {
                        left: mediaZone.left + (mediaZone.width / 2) - pinCenterOffsetPercent.left,
                        top: mediaZone.top + (mediaZone.height / 2) - pinCenterOffsetPercent.top,
                    };

                } else {

                    //place incorrect pin outside all areas
                    var limiter = 0;
                    while(limiter < 100) {

                        positionAsPercent = {
                            left: ((100 - (pinCenterOffsetPercent.marginLeft * 2)) * Math.random()) - pinCenterOffsetPercent.left + pinCenterOffsetPercent.marginLeft,
                            top: ((100 - (pinCenterOffsetPercent.top * 2)) * Math.random()),
                        };

                        var found = false;
                        for(var cz = 0; cz < correctZones.length; cz++) {
                            var cZone;
                            switch (isDesktopLayout) {
                            case true:
                                cZone=correctZones[cz].desktop;
                                break;
                            case false:
                                cZone=correctZones[cz].mobile;
                                break;
                            }
                            if (positionAsPercent.left >= cZone.left - pinCenterOffsetPercent.marginLeft && positionAsPercent.left <= cZone.left + cZone.width + pinCenterOffsetPercent.marginLeft && positionAsPercent.top >= cZone.top - pinCenterOffsetPercent.top && positionAsPercent.top <= cZone.top + cZone.height + pinCenterOffsetPercent.top) {
                                found = true;
                                break;
                            }
                        }
                        if (!found) break;
                        limiter++;
                    }
                    if (limiter === 100) console.log("PPQ: Incorrect area search - limiter reached");

                    

                }

                newAnswers.push(positionAsPercent)
                if (!isCorrectAnswer) item.per = positionAsPercent;

            }, this));

            return newAnswers;

        },
        restoreUserAnswer: function() {
            var _userAnswer = this.model.get("_userAnswer");
            var _items = this.model.get("_items");
            var isCorrectAnswer = this.model.get("_isCorrectAnswer");

            _.each(_userAnswer, _.bind(function(item, index) {
                //console.log(item);
                $(this.$pins[index]).css({
                    top: item.per.top + "%",
                    left: item.per.left + "%"
                }).removeClass("item-incorrect").removeClass("item-correct").addClass( (_items[index]._isCorrect ? "item-correct" : "item-incorrect" ) );
            }, this));
        },
        restoreAnswer: function(newAnswers) {
            var _userAnswer = this.model.get("_userAnswer");
            var _items = this.model.get("_items");
            var isCorrectAnswer = this.model.get("_isCorrectAnswer");

            _.each(newAnswers, _.bind(function(item, index) {
                //console.log(item);
                $(this.$pins[index]).css({
                    top: item.top + "%",
                    left: item.left + "%"
                }).removeClass("item-incorrect").removeClass("item-correct").addClass( (_items[index]._isCorrect || isCorrectAnswer ? "item-correct" : "item-incorrect" ) );
            }, this));
        },
        onTouchPlacePin: function(event) {
            event.pageX = event.clientX;
            event.pageY = event.clientY;
            this.onClickPlacePin(event);
        },
        onClickPlacePin: function(event) {
        	//console.log('PPQ: onClickPlacePin');
            var boundaryOffset = this.$boundary.offset();
            if (event.clientY >= boundaryOffset.top) {
                event.pageX = event.clientX;
                event.pageY = event.clientY;
            }

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

            var pointAsPixel = {
                left: ((pagePoint.left - boundaryOffset.left)),
                top:  ((pagePoint.top - boundaryOffset.top))
            };

            var pointAsPercent = {
                left: ((100 / boundaryDimensions.width) * pointAsPixel.left),
                top:  ((100 / boundaryDimensions.height) * pointAsPixel.top)
            };

            //startPoint is used for dragstart/dragend mouse to image offsets
            var startPoint = {
                left: parseFloat($pin.attr("leftstart")),
                top:  parseFloat($pin.attr("topstart"))
            };
            if (!isNaN(startPoint.left) && !isNaN(startPoint.top)) {
                var pickupPoint = {
                    left: parseFloat($pin.attr("leftpx")),
                    top: parseFloat($pin.attr("toppx"))
                };
                pointAsPercent.left += (100/boundaryDimensions.width) * (pickupPoint.left - startPoint.left);
                pointAsPercent.top += (100/boundaryDimensions.height) * (pickupPoint.top - startPoint.top);

                pinCenterOffset.left -= pickupPoint.left - startPoint.left;
                pinCenterOffset.top -= pickupPoint.top - startPoint.top;                
            }
            

            var positionAsPixel = {
                left: ((pagePoint.left - boundaryOffset.left - pinCenterOffset.left)),
                top:  ((pagePoint.top - boundaryOffset.top - pinCenterOffset.top))
            };

            var positionAsPercent = {
                left: ((100 / boundaryDimensions.width) * positionAsPixel.left),
                top:  ((100 / boundaryDimensions.height) * positionAsPixel.top)
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
                    top: parseFloat($pin.attr("toppx")),
                    left: parseFloat($pin.attr("leftpx"))  
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
                    left: ((fromPoint.left - boundaryOffset.left - pinCenterOffset.left)),
                    top:  ((fromPoint.top - boundaryOffset.top - pinCenterOffset.top))
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
