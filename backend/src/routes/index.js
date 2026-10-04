const express = require('express');
const { success } = require('../utils/response');
const authRoute = require('../modules/auth/auth.route');
const candidateRoute = require('../modules/candidate/candidate.route');
const cvRoute = require('../modules/cv/cv.route');
const recruiterRoute = require('../modules/recruiter/recruiter.route');
const companyRoute = require('../modules/company/company.route');
const jobRoute = require('../modules/job/job.route');
const aiRoute = require('../modules/ai/ai.route');
const notificationRoute = require('../modules/notification/notification.route');
const applicationRoute = require('../modules/application/application.route');

const router = express.Router();

router.get('/health', (req, res) => {
  return success(res, null, 'API is running');
});

router.use('/auth', authRoute);
router.use('/candidates', candidateRoute);
router.use('/cvs', cvRoute);
router.use('/recruiters', recruiterRoute);
router.use('/companies', companyRoute);
router.use('/jobs', jobRoute);
router.use('/matching', aiRoute);
router.use('/notifications', notificationRoute);
router.use('/applications', applicationRoute);

module.exports = router;
