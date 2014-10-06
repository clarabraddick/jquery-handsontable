
if(!window.Handsontable){
  var Handsontable = {};
}

Handsontable.eventManager = function (instance) {
  if (!instance) {
    throw  new Error ('instance not defined');
  }

  if (!instance.eventListeners) {
    instance.eventListeners = [];
  }

  var addEvent = function (element, event, delegate, callback, bubbling) {
      if (typeof delegate === 'function') {
        bubbling = callback;
        callback = delegate;
        delegate = null;
      } else {
        throw new Error("Add delegate event not implemented");

        //TODO
        var CB = callback;
        callback = function (event) {
          if (Handsontable.Dom.hasClass(event.target, delegate)) {
            CB();
          }
        }
      }

      bubbling = bubbling || false;

      instance.eventListeners.push({
        element: element,
        event: event,
        delegate: delegate,
        callback: callback,
        bubbling: bubbling
      });

      if (window.addEventListener) {
        element.addEventListener(event, callback, bubbling)
      } else {
        element.attachEvent('on' + event, callback);
      }
    },
    removeEvent = function (element, event, delegate, callback, bubbling){
      if(typeof delegate === 'function') {
        bubbling = callback;
        callback = delegate;
      }
      else {
        throw new Error("Remove delegate event not implemented");
      }

      bubbling = bubbling || false;

      if (element.detachEvent) {
        element.detachEvent('on' + event, handler);
      } else {
        element.removeEventListener(event, callback, bubbling);
      }
    },
    serveImmediatePropagation = function () {
      if (event != null && event.isImmediatePropagationEnabled == null) {
        event.stopImmediatePropagation = function () {
          this.isImmediatePropagationEnabled = false;
          this.cancelBubble = true;
        };
        event.isImmediatePropagationEnabled = true;
        event.isImmediatePropagationStopped = function () {
          return !this.isImmediatePropagationEnabled;
        };
      }
      return event;
    },
    clearEvents = function () {
      while(instance.eventListeners.length > 0) {
       var event = instance.eventListeners.pop();
        if(event.delegate) {
          removeEvent(event.element, event.event, event.delegate, event.callback, event.bubbling);
        }
        else {
          removeEvent(event.element, event.event, event.callback, event.bubbling);
        }
      }
    };

  return {
    addEventListener: addEvent,
    removeEventListener: removeEvent,
    clear: clearEvents,
    serveImmediatePropagation : serveImmediatePropagation
  }
};