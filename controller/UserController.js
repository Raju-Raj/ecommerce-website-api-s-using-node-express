const User = require("../models/UserModel.js");
const ErrorHandler = require("../utils/ErrorHandler.js");
const catchAsyncErrors = require("../middleware/catchAsyncErrors");
const sendToken = require("../utils/jwtToken.js");
const sendMail = require("../utils/sendMail.js");
const crypto = require("crypto")

//Register User

exports.createUser = catchAsyncErrors(async (req,res,next)=>{
    const {name,email,password} = req.body;

    const user = await User.create({
        name,
        email,
        password,
        avatar:{
            public_id:"https://test.com",
            url:"https://test.com"
        }
    })
    
    sendToken(user,200,res);
})

//Login User

exports.loginUser = catchAsyncErrors(async (req,res,next) => {
    const {email,password} = req.body;
    if(!email || !password){
        return next(new ErrorHandler("Please Enter your email & Password",400))
    }
    const user = await User.findOne({email}).select("+password");
    if(!user){
        return next(new ErrorHandler("User is not found with this email & password",401))
    }

    const isPasswordMatched = await user.comparePassword(password);

    if(!isPasswordMatched){
        return next(new ErrorHandler("User is not found with this email & password",401))
    }

    sendToken(user,201,res);

})

//Log out User

exports.logoutUser = catchAsyncErrors(async (req,res,next) =>{
    res.cookie("token",null,{
        expires: new Date(Date.now()),
        httpOnly: true,
    });

    res.status(200).json({
        success: true,
        message:"Log out Success",
    });
})

//Forgot password

exports.forgotPassword = catchAsyncErrors(async (req,res,next) =>{
    const user = await User.findOne({email:req.body.email});

    if(!user){
        return next(new ErrorHandler("User not found with this email",404));
    }

    //get ResetPassword Token

    const resetToken = user.getResetToken();

    await user.save({
        validateBeforeSave: false
    });

    const resetPasswordUrl = `${req.protocol}://${req.get("host")}/password/reset/${resetToken}`;

    const message = `Your password reset token is :- \n\n ${resetPasswordUrl}`

    try{

        await sendMail({
            email: user.email,
            subject:`Ecommerce password Recovery`,
            message,
        });

        res.status(200).json({
            success: true,
            message: `Email sent to ${user.email} successfully`
        })

    }catch(error){
        user.resetPasswordToken = undefined;
        user.resetPasswordTime = undefined;

        await user.save({
            validateBeforeSave:false
        })

        return next(new ErrorHandler(error.message))
    }
})


//Reset Password 

exports.resetPasssword = catchAsyncErrors(async(req,res,next) => {
    
    // create Token hash

    const resetPasswordToken = crypto.createHash("sha256").update(req.params.token).digest("hex");

    const user = await User.findOne({
        resetPasswordToken,
        resetPasswordTime: { $gt: Date.now() },
    });

    if(!user){
        return next(new ErrorHandler("Reset Password url is invalid or has been expired",400));
    }

    if(req.body.password !== req.body.confirmPassword){
        return next(new ErrorHandler("Password is not matched with the new password",400))
    }

    user.password = req.body.password;

    user.resetPasswordToken = undefined;
    user.resetPasswordTime = undefined;

    await user.save();

    sendToken(user,200,res);
})


// Get user Details

exports.userDetails = catchAsyncErrors(async (req, res, next) => {

    const user = await User.findById(req.user.id);
  
    res.status(200).json({
      success: true,
      user,
    });
  });


  // Update User Password
exports.updatePassword = catchAsyncErrors(async (req, res, next) => {
   
    const user = await User.findById(req.user.id).select("+password");

    const isPasswordMatched = await user.comparePassword(req.body.oldPassword);

    if (!isPasswordMatched) {
      return next(
        new ErrorHandler("Old Password is incorrect", 400)
      );
    };

    if(req.body.newPassword  !== req.body.confirmPassword){
        return next(
            new ErrorHandler("Password not matched with each other", 400)
          );
    }

    user.password = req.body.newPassword;

    await user.save();

    sendToken(user,200,res);
});


// Update User Profile

exports.updateProfile = catchAsyncErrors(async(req,res,next) =>{
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
    };

//    if (req.body.avatar !== "") {
//     const user = await User.findById(req.user.id);

//     const imageId = user.avatar.public_id;

//     await cloudinary.v2.uploader.destroy(imageId);

//     const myCloud = await cloudinary.v2.uploader.upload(req.body.avatar, {
//       folder: "avatars",
//       width: 150,
//       crop: "scale",
//     });
//     newUserData.avatar = {
//       public_id: myCloud.public_id,
//       url: myCloud.secure_url,
//     };
//   }

  const user = await User.findByIdAndUpdate(req.user.id, newUserData, {
    new: true,
    runValidator: true,
    useFindAndModify: false,
  });

  res.status(200).json({
    success: true,
  });
});


// Get All users ---Admin
exports.getAllUsers = catchAsyncErrors(async (req,res,next) =>{
    const users = await User.find();

    res.status(200).json({
        success: true,
        users,
    });
});


// Get Single User Details ---Admin
exports.getSingleUser = catchAsyncErrors(async (req,res,next) =>{
    const user = await User.findById(req.params.id);
   
    if(!user){
        return next(new ErrorHandler("User is not found with this id",400));
    }

    res.status(200).json({
        success: true,
        user,
    });
});
  

// Change user Role --Admin
exports.updateUserRole = catchAsyncErrors(async(req,res,next) =>{
    const newUserData = {
        name: req.body.name,
        email: req.body.email,
        role: req.body.role,
    };
    const user = await User.findByIdAndUpdate(req.params.id,newUserData, {
        new: true,
        runValidators: true,
        useFindAndModify: false,
    });

    res.status(200).json({
        success: true,
        user
    })
});


// Delete User ---Admin
exports.deleteUser = catchAsyncErrors(async(req,res,next) =>{
  
    const user = await User.findById(req.params.id);
 
    // const imageId = user.avatar.public_id;
 
    // await cloudinary.v2.uploader.destroy(imageId);
 
     if(!user){
         return next(new ErrorHandler("User is not found with this id",400));
     }
 
     await user.remove();
 
     res.status(200).json({
         success: true,
         message:"User deleted successfully"
     })
 });