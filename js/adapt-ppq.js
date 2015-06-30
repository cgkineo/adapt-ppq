define(function(require) {

	var QuestionView = require('coreViews/questionView');
	var Adapt = require('coreJS/adapt');
    var Draggabilly = require('components/adapt-ppq/js/draggabilly');

    var PPQ = QuestionView.extend({

        events: {
            "click .ppq-pinboard":"placePin",
            "click .ppq-icon": "preventDefault"
        },

        preventDefault: function(event) {
            event.preventDefault();
        },

        preRender:function(){
            QuestionView.prototype.preRender.apply(this);
            if (this.model.get("_selectable")) {
                var selectors = [];
                for (var i = 0, l = parseInt(this.model.get("_selectable")); i < l; i++) {
                    selectors.push(i)
                }
                this.model.set("_selectors", selectors);
            }
            this.setLayout();
            this.listenTo(Adapt, 'device:changed', this.handleDeviceChanged);
            this.listenTo(Adapt, 'device:resize', this.handleDeviceResize);
        },

        postRender: function() {
            QuestionView.prototype.postRender.apply(this);

            var thisHandle = this;
            //Wait for pinboard image to load then set ready. If already complete show completed state.
            this.$('.ppq-pinboard-container-inner').imageready(_.bind(function() {

                var $pins = this.$el.find('.ppq-pin');
                $pins.each(function(index, item) {
                    item.dragObj = new Draggabilly(item, {
                        containment: true
                    });
                    if (thisHandle.model.get("_isSubmitted")) {
                        item.dragObj.disable();
                    } else {
                        item.dragObj.on('dragStart', _.bind(thisHandle.onDragStart, thisHandle));
                        item.dragObj.on('dragEnd',  _.bind(thisHandle.onDragEnd, thisHandle));
                    }
                });



                this.setReadyStatus();
                if (this.model.get("_isComplete") && this.model.get("_isInteractionsComplete")) {
                    this.showCompletedState();
                }
            }, this));
        },

        updateButtons: function() {
            QuestionView.prototype.updateButtons.apply(this);

            if (this.model.get("_isSubmitted")) {
                 var $pins = this.$el.find('.ppq-pin');
                $pins.each(function(index, item) {
                    item.dragObj.disable();
                });
                this.model.set("_countCorrect",this.$(".item-correct").length);
            }

            //this.model.get('_buttonState') == 'submit' ? this.$('.ppq-reset-pins').show() : this.$('.ppq-reset-pins').hide();
        },

        showCompletedState: function() {

            //show the user answer then apply classes to set the view to a completed state
            this.hideCorrectAnswer();
            this.$(".ppq-pin").addClass("in-use");
            this.$(".ppq-widget").addClass("submitted disabled show-user-answer");
            if (this.model.get("_isCorrect")) {
                this.$(".ppq-widget").addClass("correct");
            }
        },

        handleDeviceChanged: function() {

            this.$el.css("display:block");
            
            //Currently causes layout to change from desktop to mobile even if completed.
            this.setLayout();

            var props, isDesktop = this.model.get('desktopLayout');

            _.each(this.model.get('_items'), function(item, index) {
                props = isDesktop ? item.desktop : item.mobile;
                this.$('.ppq-correct-zone').eq(index).css({left:props.left+'%', top:props.top+'%', width:props.width+'%', height:props.height+'%'});
            }, this);

            props = isDesktop ? this.model.get('_pinboardDesktop') : this.model.get('_pinboardMobile');

            this.$('.ppq-pinboard').attr({src:props.src, title:props.title, alt:props.alt});

            this.handleDeviceResize();

            if (this.model.get("_isComplete")) {
                var width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10);

                var $pins = this.$(".ppq-pin");
                var countCorrect = this.model.get("_countCorrect");
                var currentLayoutItems = this.getItemsForCurrentLayout(this.model.get("_items"));

                var moved = 0;
                var uas = this.model.get("_userAnswer");
                _.each(currentLayoutItems, _.bind(function(item) {
                    var $pin = $($pins[moved]);
                    var top = 0;
                    var left = 0;
                    var uaObj;
                    if (moved < countCorrect) {
                        top = ((height/ 100) * (item.top + (item.height/2))) - ($pin.height() / 1.05);
                        left = ((width / 100) * (item.left + (item.width / 2))) - ($pin.width() / 1.05);
                        $pin.css({
                            top: top + 'px',
                            left: left + 'px'
                        });

                    } else {
                        
                        var inpos = true;
                        while(inpos == true) {
                            inpos = false;
                            top = (Math.random() * 80) + 10;
                            left = (Math.random() * 80) + 10;
                            top = ((height/ 100) * top) - ($pin.height() / 1.05);
                            left = ((width/ 100) * left) - ($pin.width() / 1.05);

                            var atop = top - ($pin.height());
                            var aleft = left - ($pin.width() /2);

                            $pin.css({
                                top: top + 'px',
                                left: left + 'px'
                            });

                            inpos = this.isInCorrectZone($pin, undefined, currentLayoutItems);
                        }

                    }

                    uaObj = {
                            top: (100/height) * top,
                            left: (100/width) * left
                        };
                    uas[moved] = uaObj;

                    moved++;
                }, this))
                this.model.set("_userAnswer", uas);
            }

            this.handleDeviceResize();
        },

        handleDeviceResize: function() {
            this.$el.css("display:block");
            // Calls resetPins then if complete adds back classes that are required to show the completed state.
            this.resetPins();
            if (this.model.get("_isComplete")) {
                this.$(".ppq-pin").addClass("in-use");
                if (this.$(".ppq-widget").hasClass("show-user-answer")) {
                    this.hideCorrectAnswer();
                } else {
                    this.showCorrectAnswer();
                }
            }
        },

        setLayout: function() {

            //Setlayout for view. This is also called when device changes.
            if (Adapt.device.screenSize == "medium" || Adapt.device.screenSize == "large") {
                this.model.set({
                    desktopLayout:true
                });
            } else if (Adapt.device.screenSize == "small") {
                this.model.set({
                    desktopLayout:false
                });
            }
            
        },

        placePin: function(event) {
            event.preventDefault();

            //Handles click event on the pinboard image to place pins
            var $pin = this.$('.ppq-pin:not(.in-use):first');
            if ($pin.length === 0) return;

            var offset = this.$('.ppq-pinboard').offset();

            var clickY = ( event.clientY < offset.top ? event.pageY : event.clientY );
            var clickX = ( event.clientX < offset.left ? event.pageX : event.clientX );

            var relX = (clickX - offset.left) - ($pin.width() / 2);
            var relY = ((clickY - offset.top)) - $pin.height();

            $pin.css({
                top:relY + 'px',
                left:relX + 'px'
            }).addClass('in-use');
            $pin.addClass('in-use');

            var isDuplicate = this.isDuplicatePin($pin);
            if (isDuplicate) {
                $pin.removeClass('in-use');
                $pin.css({
                    top: "initial",
                    left: "initial"
                });
            }
        },

        resetQuestion: function() {
            this.resetPins();
            this.model.set({
                _isAtLeastOneCorrectSelection: false
            });

            var $pins = this.$el.find('.ppq-pin');
            $pins.each(function(index, item) {
                if (item.dragObj) item.dragObj.enable();
            });
        },

        resetPins: function(event) {

            //the class "in-use" is what makes the pins visible
            if (event) event.preventDefault();
            this.$(".ppq-pin").removeClass("in-use item-correct item-incorrect");
        },

        canSubmit: function() {
            if (this.model.get("_selectable")) {
                if(this.$(".ppq-pin.in-use").length == this.model.get("_selectors").length) {
                    return true;
                } else {
                    return false;
                }
            } else {
                if(this.$(".ppq-pin.in-use").length == this.model.get("_items").length) {
                    return true;
                } else {
                    return false;
                }
            }
        },

        storeUserAnswer:function()
        {
            var pins = this.$(".ppq-pin");

            // User answers aren't stored in the items array. Instead we create a new array with userAnswer objects.
            var userAnswers = [];

            _.each(pins, function(pin) {
               // userAnswer stores the return value from getUserAnswer and adds that to the userAnswers array.
               var userAnswer = this.getUserAnswer($(pin));
               userAnswers.push(userAnswer);
            }, this);

            this.model.set('_userAnswer', userAnswers);
        },

        isCorrect: function() {
            var correctCount = 0;
            var pins = this.$(".ppq-pin");

            // There are both desktop and mobile items but nested in the same items object.
            // So we need to store the currentLayoutItems locally to check answers against the current layout.
            var currentLayoutItems = this.getItemsForCurrentLayout(this.model.get("_items"));

            // Loop through the currentLayoutItems and check each answer
            _.each(currentLayoutItems, function(item, index) {
                _.each(pins, function(pin, pIndex) {
                    var $pin = $(pin);
                    var isCorrect = this.isInCorrectZone($pin, item);
                    if (isCorrect) {
                        item._isPlacementCorrect = true;
                        correctCount++;
                        this.model.set('_isAtLeastOneCorrectSelection', true);
                   } else {
                        item._isPlacementCorrect = false;
                   }
                }, this);
            }, this);

            if (this.model.get("_selectable")) {
                return correctCount == this.model.get("_selectors").length;
            } else {
                return correctCount == currentLayoutItems.length;
            }
        },

        isPartlyCorrect: function() {
            return this.model.get('_isAtLeastOneCorrectSelection');
        },

        getItemsForCurrentLayout: function(items) {

            // Returns an array of items based on current layout
            var currentLayoutItems = [];
            _.each(items, function(item) {
                var newItem;
                if (this.model.get("desktopLayout")) {
                    newItem = item.desktop;
                } else {
                    newItem = item.mobile;
                }
                newItem._isCorrect = item._isCorrect;
                currentLayoutItems.push(newItem);
            }, this);
            return currentLayoutItems;
        },

        isInCorrectZone: function($pin, item, items){
            var width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10),
                pinLeft = parseFloat($pin.css("left")) + (parseFloat($pin.css("width")) / 2),
                pinTop = parseFloat($pin.css("top")) + parseFloat($pin.css("height")),
                inCorrectZone = false;
            var pinId = $pin.attr("data-id");

            if(item) {
                var top = (item.top/100)*height,
                    left = (item.left/100)*width,
                    bottom = top + (item.height/100)*height,
                    right = left + (item.width/100)*width;
                inCorrectZone = pinLeft > left && pinLeft < right && pinTop < bottom && pinTop > top;
                inCorrectZone = inCorrectZone  && item._isCorrect !== false;
                return inCorrectZone;
            } else {
                for (var i = 0; i < items.length; i++) {
                    var item = items[i],
                        top = (item.top/100)*height,
                        left = (item.left/100)*width,
                        bottom = top + (item.height/100)*height,
                        right = left + (item.width/100)*width;
                    inCorrectZone = pinLeft > left && pinLeft < right && pinTop < bottom && pinTop > top;
                    inCorrectZone = inCorrectZone  && item._isCorrect !== false;
                    if(inCorrectZone) break;
                }
                return inCorrectZone;
            }
        },

        getPinZone: function($pin, items){
            var width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10),
                pinLeft = parseFloat($pin.css("left")) + (parseFloat($pin.css("width")) / 2),
                pinTop = parseFloat($pin.css("top")) + parseFloat($pin.css("height")),
                inCorrectZone = false;
            var pinId = $pin.attr("data-id");

            for (var i = 0; i < items.length; i++) {
                var item = items[i],
                    top = (item.top/100)*height,
                    left = (item.left/100)*width,
                    bottom = top + (item.height/100)*height,
                    right = left + (item.width/100)*width;
                inCorrectZone = pinLeft > left && pinLeft < right && pinTop < bottom && pinTop > top;
                if(inCorrectZone) return i;
            }
            return -1;
        },

        getUserAnswer: function($pin) {

            // Returns a user answer object that gets added to a userAnswers array
            var left = parseFloat($pin.css("left")),
                top = parseFloat($pin.css("top")),
                width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10);
            return {
                left: (100/width) * left,
                top: (100/height) * top
            }
        },

        showMarking:function()
        {
            this.hideCorrectAnswer();
        },

        hideCorrectAnswer: function() {
            var width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10);
            var pins = this.$(".ppq-pin");
            var userAnswers = this.model.get("_userAnswer");
            var currentLayoutItems = this.getItemsForCurrentLayout(this.model.get("_items"));

            _.each(userAnswers, function(userAnswer, index) {
                var $pin = $(pins[index])
                $pin.css({
                    top:(height/100) * userAnswer.top + "px",
                    left:(width/100) *userAnswer.left + "px"
                });

                // Reset classes then apply correct incorrect
                $pin.removeClass("item-correct item-incorrect");
                if (this.isInCorrectZone($pin, null, currentLayoutItems)) {
                    $pin.addClass("item-correct");
                } else {
                    $pin.addClass("item-incorrect");
                }
            }, this);
        },

        showCorrectAnswer: function() {
            var width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10);
            var pins = this.$(".ppq-pin"),
                answers = this.getItemsForCurrentLayout(this.model.get("_items"));
            _.each(answers, function(item, index) {
                var $pin = $(pins[index]);
                $pin.css({
                    top: ((height/ 100) * (item.top + (item.height/2))) - ($pin.height() / 2 ) + 'px',
                    left: ((width / 100) * (item.left + (item.width / 2))) - ($pin.width() / 2) + 'px'
                });
                $pin.removeClass("item-incorrect").addClass("item-correct");
            });
        },

        onDragStart: function(event) {
            console.log("Drag Start");
            var $pin = $(event.element);
            var pos = {
                top: $pin.css("top"),
                left: $pin.css("left")
            };
            $pin.attr("data-prev", JSON.stringify(pos));
        },

        onDragEnd: function(event) {
            console.log("Drag End");

            var $pin = $(event.element);

            var isDuplicate = this.isDuplicatePin($pin);
            if (isDuplicate) {
                console.log("Duplicate!")
                var pos = JSON.parse($pin.attr("data-prev"));
                $pin.css(pos);
            }
        },

        isDuplicatePin: function($pin) {
            var pins = this.$(".ppq-pin");
            var currentLayoutItems = this.getItemsForCurrentLayout(this.model.get("_items"));

            var pinZone = this.getPinZone($pin, currentLayoutItems);
            var pinDataId = $pin.attr("data-id");

            var populatedZones = {};
            for (var i = 0, l = pins.length; i < l; i++) {
                var $curPin = $(pins[i]);
                var curPinDataId = $curPin.attr("data-id");
                //if (curPinDataId === pinDataId ) continue;
                var zone = this.getPinZone($curPin, currentLayoutItems);
                if (populatedZones[zone] === undefined) populatedZones[zone] = [];
                populatedZones[zone].push(curPinDataId);
            }

            if (populatedZones[pinZone].length > 1 && pinZone > -1) return true;
            return false;
            
        }

    });

    Adapt.register("ppq", PPQ);

    return PPQ;

});
