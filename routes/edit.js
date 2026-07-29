import {Router} from 'express';
import { auth } from '../middlewares/auth.js';
const router = Router();

router.get('/', (req,res) => {
    return res.render('edit', {title: 'Edit profile'})
})

export default router;