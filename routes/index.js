const express = require('express');
const router= express.Router();
const userModel = require("./users");
const courseModel = require("./course");
require('dotenv').config();
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.CLOUD_API_KEY,
  api_secret: process.env.CLOUD_API_SECRET
});




router.get('/dashboard',isLoggedIn,function(req,res,next){
  res.render("dashboard")
});
router.post('/createCourse', isLoggedIn,async (req, res) => {
    const course = req.files.courseImage;
    cloudinary.uploader.upload(course.tempFilePath, async function (err, result) {
      if (err) return next(err);
      const newCourse = new courseModel({
        courseName: req.body.courseName,
        courseDescription: req.body.courseDescription,
        courseDuration: req.body.courseDuration,
        coursePrice: req.body.coursePrice,
        courseImage: result.secure_url,
        seatsAvailable: req.body.seatsAvailable,
      });
      await newCourse.save();
      req.flash('success', 'course created successfully');
      res.redirect('/manageCourse');
    })
});
router.get('/createCourse', isLoggedIn,(req, res) => {
  res.render('createCourse');
});
router.get('/createEvent', isLoggedIn,(req, res) => {
  res.render('createEvent');
});
router.get('/manageCourse', isLoggedIn, async function (req, res, next) {
  try {
    const courses = await courseModel.find({});

    // Pass flash messages to the template
    const successMessage = req.flash('success');
    const errorMessage = req.flash('error');

    res.render('manageCourse', { courses, successMessage, errorMessage });
  } catch (error) {
    console.error("Error fetching course:", error);
    req.flash('error', 'Failed to fetch course data');
    res.redirect('/dashboard'); // Redirect to a suitable page in case of error
  }
});

router.get('/editCourse/:id', isLoggedIn, async function (req, res, next) {
  const course = await courseModel.findById(req.params.id);
  res.render('editCourse', { course });
});

router.post('/editCourse/:id', isLoggedIn, async function (req, res, next) {
  try {
    const course = await courseModel.findByIdAndUpdate(req.params.id, {
      courseName: req.body.courseName,
      courseDescription: req.body.courseDescription,
      courseDuration : req.body.courseDuration,
      coursePrice: req.body.coursePrice,
      seatsAvailable:req.body.seatsAvailable
    }, { new: true });
    await course.save();

    // Set flash message
    req.flash('success', 'Course details updated successfully');

    res.redirect('/manageCourse');
  } catch (error) {
    // Handle error appropriately
    console.error("Error updating product:", error);
    req.flash('error', 'Failed to update product details');
    res.redirect('/manageProducts');
  }
});

router.get('/deleteCourse/:id', isLoggedIn, async function (req, res, next) {
  try {
    const course = await courseModel.findById(req.params.id);

    // Delete the image from Cloudinary
    const imageURL = course.courseImage;
    const publicID = imageURL.split('/').pop().split('.')[0];
    await cloudinary.uploader.destroy(publicID);

    // Delete the course from the database
    await courseModel.findByIdAndDelete(req.params.id);

    // Set flash message
    req.flash('success', 'Course deleted successfully');

    res.redirect('/manageCourse');
} catch (error) {
    console.error("Error deleting course:", error);
    req.flash('error', 'Failed to delete course');
    res.redirect('/manageCourse');
}
});

// auth routes 
router.get('/login', async function (req, res, next) {
  try {
    res.render('login', {error: req.flash('error') });
  } catch (error) {
    console.error('Error occurred while fetching data:', error);
    next(error);
  }
});

router.post('/login', async function (req, res, next) {
  try {
    const { email, password } = req.body;
    const userExist = await userModel.findOne({ email });
    if (!userExist) {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }

    const user = await userExist.comparePassword(password);

    if (user) {
      const token = await userExist.generateToken();
      res.cookie('token', token, { httpOnly: true }); // Set token as a cookie
        res.redirect('/dashboard');
    } else {
      req.flash('error', 'Invalid credentials');
      return res.redirect('/login');
    }
  }
  catch (error) {
    console.error(error);
    res.status(500).json({ error: 'An error occurred while login' });
  };

});
  
router.get('/register', function (req, res, next) {
  res.render('register', { error: req.flash('error') });
});
  
router.post('/register',async function(req,res,next){
    try{
      if ( !req.body.username || !req.body.email || !req.body.password) {
        req.flash('error', 'All fields are required');
        return res.redirect('/login');
      }

      const { username,password, email } = req.body;
      const existingUserEmail = await userModel.findOne({ email });
      if (existingUserEmail) {
        req.flash('error', 'This Email already exists');
        return res.redirect('/register');
      }
      const data = await userModel.create({ username,email, password })
      const token = await data.generateToken();
      res.cookie('token', token, { httpOnly: true }); // Set token as a cookie
      res.redirect('/dashboard'); // Redirect to / page
    }
    catch (error) {
      console.error(error);
      res.status(500).json({ error: 'An error occurred while registering the user' });
    };
  
  });

  router.get('/logout', (req, res) => {
    try {
      res.clearCookie('token');
      res.redirect('/login');
    } catch (err) {
      console.error("Error during logout:", err);
      res.status(500).send('Internal Server Error');
    }
  });
  
  
   function isLoggedIn(req, res, next) {
    const token = req.cookies.token;
  
    if (token == null) return res.redirect('/login');
  
    jwt.verify(token, process.env.JWT_SECRET_KEY, async (err, user) => {
      if (err) {
        return res.redirect('/login');
      }
      const userRole = await userModel.findById(user._id);
      if (userRole.role != 'admin') {
        return res.redirect('/login');
    } else {
      req.user = user;
      next();
    }
    });
  }


module.exports = router;
