const constancy = require("../src/constancy");

describe("Tests constancy function", () => {
  it("Should has a length of 1", () => {
    expect(Object.freeze.length).toBe(1);
  });

  it("Tests constancy object", () => {
    var obj = { a: 1 };
    constancy(obj);
    obj.a = 2;
    expect(obj.a).toBe(1);
  });

  it("Tests constancy array", () => {
    var arr = [1];
    constancy(arr);
    try {
      arr.push(2);
    } catch {
      expect(arr.length).toBe(1);
    }
  });
});

describe("Throw a TypeError", () => {
  it("null", () => {
    expect(constancy(null)).toBe(null);
  });

  it("undefined", () => {
    expect(constancy(undefined)).toBe(undefined);
  });

  it("string", () => {
    expect(constancy("string")).toBe("string");
  });

  it("number", () => {
    expect(constancy(1)).toBe(1);
  });

  it("boolean", () => {
    expect(constancy(true)).toBe(true);
  });

  it("object", () => {
    expect(constancy({})).toEqual({});
  });

  it("array", () => {
    expect(constancy([])).toEqual([]);
  });

  it("function", () => {
    expect(constancy(() => {})).toBeInstanceOf(Function);
  });

  it("regexp", () => {
    expect(constancy(/regexp/)).toBeInstanceOf(RegExp);
  });

  it("date", () => {
    expect(constancy(new Date())).toBeInstanceOf(Date);
  });

  it("error", () => {
    expect(constancy(new Error())).toBeInstanceOf(Error);
  });

  it("map", () => {
    expect(constancy(new Map())).toBeInstanceOf(Map);
  });

  it("set", () => {
    expect(constancy(new Set())).toBeInstanceOf(Set);
  });

  it("weakmap", () => {
    expect(constancy(new WeakMap())).toBeInstanceOf(WeakMap);
  });

  it("weakset", () => {
    expect(constancy(new WeakSet())).toBeInstanceOf(WeakSet);
  });

  it("promise", () => {
    expect(constancy(Promise.resolve())).toBeInstanceOf(Promise);
  });
});
