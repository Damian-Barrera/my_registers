import {Router} from 'express';

const router = Router();

router.get('/', (req,res) => {
    return res.render('edit', {title: 'Edit profile'})
})

export default router;