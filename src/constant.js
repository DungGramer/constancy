/**
 * Constancy
 * Make constancy for a value.
 *
 * @param {any} val
 * @returns {any}
 *
 * @example
 * const a = constancy([1, 2, 3]);
 * const b = constancy({ a: 1, b: 2 });
 */
function constancy(val) {
  if (val === null) return val;

  switch (typeof val) {
    case "object":
    case "function":
      break;
    default:
      return val;
  }

  if (!Object.freeze) {
    Object.freeze = function (obj) {
      var props = Object.getOwnPropertyNames(obj);
      for (var i = 0; i < props.length; ++i) {
        var desc = Object.getOwnPropertyDescriptor(obj, props[i]);

        if (desc.value) {
          desc.writable = false;
        }

        desc.configurable = false;

        Object.defineProperty(obj, props[i], desc);
      }

      return Object.preventExtensions(obj);
    };
  }
  return Object.freeze(val);
}

module.exports = constancy;
