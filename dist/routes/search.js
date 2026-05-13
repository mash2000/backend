"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const searchController_1 = require("../controllers/searchController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const searchController = new searchController_1.SearchController();
router.get('/', auth_1.authenticate, searchController.search);
router.get('/tags', auth_1.authenticate, searchController.getTags);
exports.default = router;
//# sourceMappingURL=search.js.map