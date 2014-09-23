define(function(require) {

	var QuestionView = require('coreViews/questionView');
	var Adapt = require('coreJS/adapt');

    var PPQ = QuestionView.extend({

        events: {
            "click .ppq-pinboard":"placePin",
            "click .button.ppq-reset-pins":"resetPins"
        },

        preRender:function(){
            QuestionView.prototype.preRender.apply(this);
            this.setLayout();
            this.listenTo(Adapt, 'device:changed', this.handleDeviceChanged);
            this.listenTo(Adapt, 'device:resize', this.handleDeviceResize);
        },

        postRender: function() {
            QuestionView.prototype.postRender.apply(this);

            //Wait for pinboard image to load then set ready. If already complete show completed state.
            this.$('.ppq-pinboard-container-inner').imageready(_.bind(function() {
                this.setReadyStatus();
                if (this.model.get("_isComplete")) {
                    this.showCompletedState();
                }
            }, this));
        },

        updateButtons: function() {
            QuestionView.prototype.updateButtons.apply(this);

            this.model.get('_buttonState') == 'submit' ? this.$('.ppq-reset-pins').show() : this.$('.ppq-reset-pins').hide();
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
            
            //Currently causes layout to change from desktop to mobile even if completed.
            this.setLayout();

            var props, isDesktop = this.model.get('desktopLayout');

            _.each(this.model.get('_items'), function(item, index) {
                props = isDesktop ? item.desktop : item.mobile;
                this.$('.ppq-correct-zone').eq(index).css({left:props.left+'%', bottom:props.bottom+'%', width:props.width+'%', height:props.height+'%'});
            }, this);

            props = isDesktop ? this.model.get('_pinboardDesktop') : this.model.get('_pinboardMobile');

            this.$('.ppq-pinboard').attr({src:props.src, title:props.title, alt:props.alt});
        },

        handleDeviceResize: function() {

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

            //Handles click event on the pinboard image to place pins
            var $pin = this.$('.ppq-pin:not(.in-use):first');
            var offset = this.$('.ppq-pinboard').offset();
            var relX = (event.pageX - offset.left) - ($pin.width() / 2);
            var relY = (this.$('.ppq-pinboard').height() - (event.pageY - offset.top)) - ($pin.height() / 2);
            $pin.css({
                bottom:relY + 'px',
                left:relX + 'px'
            }).addClass('in-use');
        },

        resetQuestion: function() {
            this.resetPins();
            this.model.set({
                _isAtLeastOneCorrectSelection: false
            });
        },

        resetPins: function(event) {

            //the class "in-use" is what makes the pins visible
            if (event) event.preventDefault();
            this.$(".ppq-pin").removeClass("in-use correct incorrect").css({
                bottom:0, left:0
            });
        },

        canSubmit: function() {
            if(this.$(".ppq-pin.in-use").length == this.model.get("_items").length) {
                return true;
            } else {
                return false;
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
                var $pin = $(pins[index]);
                var isCorrect = this.isInCorrectZone($pin, null, currentLayoutItems);
                if (isCorrect) {
                    item._isCorrect = true;
                    correctCount++;
                    this.model.set('_isAtLeastOneCorrectSelection', true);
               } else {
                    item._isCorrect = false;
               }
            }, this);

            return correctCount == currentLayoutItems.length;
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
                currentLayoutItems.push(newItem);
            }, this);
            return currentLayoutItems;
        },

        isInCorrectZone: function($pin, item, items){
            var width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10),
                pinLeft = parseFloat($pin.css("left")) + parseFloat($pin.css("width")) / 2,
                pinBottom = parseFloat($pin.css("bottom")) + parseFloat($pin.css("height")) / 2,
                inCorrectZone = false;

            if(item) {
                var bottom = (item.bottom/100)*height,
                    left = (item.left/100)*width,
                    top = bottom + (item.height/100)*height,
                    right = left + (item.width/100)*width;
                return pinLeft > left && pinLeft < right && pinBottom > bottom && pinBottom < top;
            } else {
                for (var i = 0; i < items.length; i++) {
                    var item = items[i],
                        bottom = (item.bottom/100)*height,
                        left = (item.left/100)*width,
                        top = bottom + (item.height/100)*height,
                        right = left + (item.width/100)*width;
                    inCorrectZone = pinLeft > left && pinLeft < right && pinBottom > bottom && pinBottom < top;
                    if(inCorrectZone) break;
                }
                return inCorrectZone;
            }
        },

        getUserAnswer: function($pin) {

            // Returns a user answer object that gets added to a userAnswers array
            var left = parseFloat($pin.css("left")),
                bottom = parseFloat($pin.css("bottom")),
                width = parseInt(this.$('.ppq-pinboard').width(),10),
                height = parseInt(this.$('.ppq-pinboard').height(),10);
            return {
                left: (left / width) * 100,
                bottom: (bottom / height) * 100
            }
        },

        showMarking:function()
        {
            this.hideCorrectAnswer();
        },

        hideCorrectAnswer: function() {
            var pins = this.$(".ppq-pin");
            var userAnswers = this.model.get("_userAnswer");
            var currentLayoutItems = this.getItemsForCurrentLayout(this.model.get("_items"));

            _.each(userAnswers, function(userAnswer, index) {
                var $pin = $(pins[index])
                $pin.css({
                    bottom:userAnswer.bottom + '%',
                    left:userAnswer.left + '%'
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
            var pins = this.$(".ppq-pin"),
                answers = this.getItemsForCurrentLayout(this.model.get("_items"));
            _.each(answers, function(item, index) {
                var $pin = $(pins[index]);
                $pin.css({
                    bottom:item.bottom + '%',
                    left:item.left + '%'
                });
                $pin.removeClass("item-incorrect").addClass("item-correct");
            });
        }

    });

    Adapt.register("ppq", PPQ);

    return PPQ;

});
