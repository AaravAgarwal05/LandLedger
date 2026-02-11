"use strict";

const { Contract } = require("fabric-contract-api");

class TestContract extends Contract {
  constructor() {
    super("TestContract");
  }

  async ping(ctx) {
    return "pong";
  }
}

module.exports = { TestContract };
