import {Router} from "express";
import { auth } from "../middlewares/auth.js";
const router = Router();

router.get('/', auth, (req, res) => {
    return res.render('profile')
})


export default router;