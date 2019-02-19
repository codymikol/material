/**
 * @ngdoc module
 * @name material.core.interaction
 * @description
 * User interaction detection to provide proper accessibility.
 */
angular
    .module('material.core.interaction', [])
    .factory('$mdInteraction', MdInteractionService);

/**
 * @ngdoc service
 * @name $mdInteraction
 * @module material.core.interaction
 *
 * @description
 *
 * Service which keeps track of the last interaction type and validates them for several browsers.
 * The service hooks into the document's body and listens for touch, mouse and keyboard events.
 *
 * The most recent interaction type can be retrieved by calling the `getLastInteractionType` method.
 *
 * Here is an example markup for using the interaction service.
 *
 * <hljs lang="js">
 *   var lastType = $mdInteraction.getLastInteractionType();
 *
 *   if (lastType === 'keyboard') {
 *     // We only restore the focus for keyboard users.
 *     restoreFocus();
 *   }
 * </hljs>
 *
 */
function MdInteractionService($mdUtil, $timeout, $rootScope) {

    var service = {
        onInputEvent: onInputEvent,
        onBufferInputEvent: onBufferInputEvent,
        getLastInteractionType: getLastInteractionType,
        isUserInvoked: isUserInvoked,
    };

    var self = this;
    // IE browsers can also trigger pointer events, which also leads to an interaction.
    var pointerEvent = 'MSPointerEvent' in window ? 'MSPointerDown' : 'PointerEvent' in window ? 'pointerdown' : null;
    var bodyElement = angular.element(document.body);
    var isBuffering = false;
    var bufferTimeout = null;
    var lastInteractionType = null;
    var lastInteractionTime = null;
    var inputHandler = onInputEvent.bind(self);
    var bufferedInputHandler = onBufferInputEvent.bind(self);

    $rootScope.$on('$destroy', unregisterInteractionEvents);

    // Type Mappings for the different events
    // There will be three three interaction types
    // `keyboard`, `mouse` and `touch`
    // type `pointer` will be evaluated in `pointerMap` for IE Browser events
    var inputEventMap = {
        'keydown': 'keyboard',
        'mousedown': 'mouse',
        'mouseenter': 'mouse',
        'touchstart': 'touch',
        'pointerdown': 'pointer',
        'MSPointerDown': 'pointer'
    };

    // IE PointerDown events will be validated in `touch` or `mouse`
    // Index numbers referenced here: https://msdn.microsoft.com/library/windows/apps/hh466130.aspx
    var iePointerMap = {
        2: 'touch',
        3: 'touch',
        4: 'mouse'
    };

    /**
     * Unregisters events created by the $mdInteraction service from the
     * body element.
     */
    function unregisterInteractionEvents() {
        bodyElement.off('keydown mousedown ' + pointerEvent, inputHandler);
        bodyElement.off('touchstart', bufferedInputHandler);
    }

    /**
     * Initializes the interaction service, by registering all interaction events to the
     * body element.
     */
    function initializeEvents() {

        bodyElement.on('keydown mousedown', inputHandler);

        if ('ontouchstart' in document.documentElement) {
            bodyElement.on('touchstart', bufferedInputHandler);
        }

        if (pointerEvent) {
            bodyElement.on(pointerEvent, inputHandler);
        }

    }

    /**
     * Event listener for normal interaction events, which should be tracked.
     * @param event {MouseEvent|KeyboardEvent|PointerEvent|TouchEvent}
     */
    function onInputEvent(event) {
        if (isBuffering) {
            return;
        }

        var type = inputEventMap[event.type];

        if (type === 'pointer') {
            type = iePointerMap[event.pointerType] || event.pointerType;
        }

        lastInteractionType = type;
        lastInteractionTime = $mdUtil.now();
    }

    /**
     * Event listener for interaction events which should be buffered (touch events).
     * @param event {TouchEvent}
     */
    function onBufferInputEvent(event) {
        $timeout.cancel(bufferTimeout);

        onInputEvent(event);
        isBuffering = true;

        // The timeout of 650ms is needed to delay the touchstart, because otherwise the touch will call
        // the `onInput` function multiple times.
        bufferTimeout = $timeout(function () {
            isBuffering = false;
        }.bind(self), 650, false);
    }

    /**
     * @ngdoc method
     * @name $mdInteraction#getLastInteractionType
     * @description Retrieves the last interaction type triggered in body.
     * @returns {string|null} Last interaction type.
     */
    function getLastInteractionType() {
        return lastInteractionType;
    }

    /**
     * @ngdoc method
     * @name $mdInteraction#isUserInvoked
     * @description Method to detect whether any interaction happened recently or not.
     * @param {number=} checkDelay Time to check for any interaction to have been triggered.
     * @returns {boolean} Whether there was any interaction or not.
     */
    function isUserInvoked(checkDelay) {
        var delay = angular.isNumber(checkDelay) ? checkDelay : 15;
        // Check for any interaction to be within the specified check time.
        return lastInteractionTime >= $mdUtil.now() - delay;
    }

    initializeEvents();

    return service;

}
