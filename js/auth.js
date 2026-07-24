
/* ==========================================
   CIPHER AUTH
   Created by Fatai Quadri
========================================== */

"use strict";

/* ==========================================
   AUTH ELEMENTS
========================================== */

const Auth = {

    loginForm: document.getElementById("login-form"),

    signupForm: document.getElementById("signup-form"),

    loginEmail: document.getElementById("login-email"),

    loginPassword: document.getElementById("login-password"),

    signupUsername: document.getElementById("signup-username"),

    signupEmail: document.getElementById("signup-email"),

    signupPassword: document.getElementById("signup-password"),

    loginError: document.getElementById("login-error"),

    signupError: document.getElementById("signup-error")

};


/* ==========================================
   SWITCH TABS
========================================== */

function showTab(tab){

    document
        .querySelectorAll(".auth-tab")
        .forEach(button=>{

            button.classList.remove("active");

        });

    if(tab==="login"){

        document
            .querySelectorAll(".auth-tab")[0]
            .classList.add("active");

        Auth.loginForm.style.display="flex";

        Auth.signupForm.style.display="none";

    }

    else{

        document
            .querySelectorAll(".auth-tab")[1]
            .classList.add("active");

        Auth.signupForm.style.display="flex";

        Auth.loginForm.style.display="none";

    }

}


/* ==========================================
   CLEAR ERRORS
========================================== */

function clearAuthErrors(){

    Auth.loginError.textContent="";

    Auth.signupError.textContent="";

}


/* ==========================================
   LOGIN
========================================== */

async function doLogin(){

    clearAuthErrors();

    const email = Auth.loginEmail.value.trim();

    const password = Auth.loginPassword.value;

    if(!email){

        Auth.loginError.textContent="Please enter your email.";

        return;

    }

    if(!password){

        Auth.loginError.textContent="Please enter your password.";

        return;

    }

    try{

        const response = await fetch("/login",{

            method:"POST",

            headers:{
                "Content-Type":"application/json"
            },

            body:JSON.stringify({

                email,

                password

            })

        });

        const data = await response.json();

        if(data.success){

            showSuccess("Welcome back!");

            enterApp(data.username);

        }

        else{

            Auth.loginError.textContent=

                data.error || "Login failed.";

        }

    }

    catch(error){

        console.error(error);

        Auth.loginError.textContent=

            "Unable to connect to server.";

    }

}


/* ==========================================
   SIGNUP
========================================== */

async function doSignup(){

    clearAuthErrors();

    const username =

        Auth.signupUsername.value.trim();

    const email =

        Auth.signupEmail.value.trim();

    const password =

        Auth.signupPassword.value;

    if(username.length < 3){

        Auth.signupError.textContent=

            "Username must be at least 3 characters.";

        return;

    }

    if(password.length < 6){

        Auth.signupError.textContent=

            "Password must be at least 6 characters.";

        return;

    }

    try{

        const response = await fetch("/signup",{

            method:"POST",

            headers:{

                "Content-Type":"application/json"

            },

            body:JSON.stringify({

                username,

                email,

                password

            })

        });

        const data = await response.json();

        if(data.success){

            showSuccess(

                "Account created successfully."

            );

            enterApp(data.username);

        }

        else{

            Auth.signupError.textContent=

                data.error || "Signup failed.";

        }

    }

    catch(error){

        console.error(error);

        Auth.signupError.textContent=

            "Unable to connect to server.";

    }

}


/* ==========================================
   LOGOUT
========================================== */

async function doLogout(){

    try{

        const response = await fetch("/logout",{

            method:"POST"

        });

        const data = await response.json();

        if(data.success){

            Cipher.user = null;

            Cipher.currentChat = null;

            Cipher.chats = [];

            showSuccess("Signed out successfully.");

            showAuthScreen();

        }

    }

    catch(error){

        console.error(error);

        showError("Unable to sign out.");

    }

}


/* ==========================================
   SESSION CHECK
========================================== */

async function refreshSession(){

    try{

        const response = await fetch("/me");

        const data = await response.json();

        if(data.logged_in){

            Cipher.user = data;

        }

        else{

            showAuthScreen();

        }

    }

    catch(error){

        console.error(error);

    }

}


/* ==========================================
   SESSION TIMER
========================================== */

setInterval(()=>{

    if(Cipher.user){

        refreshSession();

    }

},300000);


/* ==========================================
   AUTH HELPERS
========================================== */

function clearLoginFields(){

    Auth.loginEmail.value="";

    Auth.loginPassword.value="";

}

function clearSignupFields(){

    Auth.signupUsername.value="";

    Auth.signupEmail.value="";

    Auth.signupPassword.value="";

}


/* ==========================================
   GOOGLE SIGN IN
========================================== */

async function signInWithGoogle() {

    try {

        showInfo("Redirecting to Google...");

        window.location.href = "/login/google";

    }

    catch (error) {

        console.error(error);

        showError("Google sign in failed.");

    }

}


/* ==========================================
   GOOGLE CALLBACK
========================================== */

async function handleGoogleLogin() {

    try {

        const response = await fetch("/login/google/status");

        const data = await response.json();

        if (data.success) {

            Cipher.user = data;

            showSuccess(
                "Signed in with Google."
            );

            enterApp(data.username);

        }

    }

    catch (error) {

        console.error(error);

    }

}


/* ==========================================
   INITIALIZE GOOGLE LOGIN
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    handleGoogleLogin();

});


/* ==========================================
   REMEMBER ME
========================================== */

const RememberMe = {

    checkbox: document.getElementById("remember-me")

};


/* ==========================================
   SAVE LOGIN
========================================== */

function saveRememberMe(email){

    if(!RememberMe.checkbox) return;

    if(RememberMe.checkbox.checked){

        localStorage.setItem(

            "cipher-remember-email",

            email

        );

        localStorage.setItem(

            "cipher-remember",

            "true"

        );

    }

    else{

        localStorage.removeItem(

            "cipher-remember-email"

        );

        localStorage.removeItem(

            "cipher-remember"

        );

    }

}


/* ==========================================
   LOAD LOGIN
========================================== */

function loadRememberMe(){

    const remember =

        localStorage.getItem(

            "cipher-remember"

        );

    if(

        remember==="true" &&

        RememberMe.checkbox

    ){

        RememberMe.checkbox.checked = true;

        Auth.loginEmail.value =

            localStorage.getItem(

                "cipher-remember-email"

            ) || "";

    }

}


/* ==========================================
   INITIALIZE
========================================== */

document.addEventListener(

    "DOMContentLoaded",

    loadRememberMe

);


/* ==========================================
   FORGOT PASSWORD
========================================== */

async function forgotPassword() {

    clearAuthErrors();

    const email = Auth.loginEmail.value.trim();

    if (!email) {

        Auth.loginError.textContent =
            "Enter your email first.";

        return;

    }

    try {

        const response = await fetch(
            "/forgot-password",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    email
                })
            }
        );

        const data = await response.json();

        if (data.success) {

            showSuccess(
                "Password reset instructions have been sent if the email exists."
            );

        } else {

            Auth.loginError.textContent =
                data.error || "Unable to process request.";

        }

    }

    catch (error) {

        console.error(error);

        Auth.loginError.textContent =
            "Unable to connect to server.";

    }

}


/* ==========================================
   RESET PASSWORD
========================================== */

async function resetPassword(token, password) {

    try {

        const response = await fetch(
            "/reset-password",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    token,

                    password

                })

            }
        );

        return await response.json();

    }

    catch (error) {

        console.error(error);

        return {

            success: false,

            error: "Network error."

        };

    }

}


/* ==========================================
   PASSWORD VISIBILITY
========================================== */

function togglePassword(inputId, button) {

    const input = document.getElementById(inputId);

    if (!input) return;

    if (input.type === "password") {

        input.type = "text";

        button.innerHTML = "🙈";

    } else {

        input.type = "password";

        button.innerHTML = "👁";

    }

}


/* ==========================================
   EMAIL VALIDATION
========================================== */

function isValidEmail(email) {

    const pattern =

        /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return pattern.test(email);

}


/* ==========================================
   PASSWORD STRENGTH
========================================== */

function checkPasswordStrength(password) {

    let score = 0;

    if (password.length >= 8) score++;

    if (/[A-Z]/.test(password)) score++;

    if (/[a-z]/.test(password)) score++;

    if (/[0-9]/.test(password)) score++;

    if (/[^A-Za-z0-9]/.test(password)) score++;

    return score;

}


/* ==========================================
   LIVE VALIDATION
========================================== */

if (Auth.signupEmail) {

    Auth.signupEmail.addEventListener("blur", () => {

        if (

            Auth.signupEmail.value &&

            !isValidEmail(Auth.signupEmail.value)

        ) {

            Auth.signupError.textContent =

                "Enter a valid email address.";

        }

    });

}


if (Auth.signupPassword) {

    Auth.signupPassword.addEventListener("input", () => {

        const strength =

            checkPasswordStrength(

                Auth.signupPassword.value

            );

        if (

            Auth.signupPassword.value.length > 0 &&

            strength < 3

        ) {

            Auth.signupError.textContent =

                "Password is weak.";

        }

        else {

            Auth.signupError.textContent = "";

        }

    });

}


/* ==========================================
   AUTH INITIALIZATION
========================================== */

function initializeAuth() {

    clearAuthErrors();

    loadRememberMe();

    showTab("login");

}


/* ==========================================
   AUTH STATE
========================================== */

function isLoggedIn() {

    return Cipher.user !== null;

}


function requireLogin() {

    if (!isLoggedIn()) {

        showAuthScreen();

        return false;

    }

    return true;

}


/* ==========================================
   USER PROFILE
========================================== */

function updateUserProfile(user) {

    if (!user) return;

    Cipher.user = user;

    if (App.userName) {

        App.userName.textContent = user.username;

    }

    if (App.userAvatar) {

        App.userAvatar.textContent =

            user.username.charAt(0).toUpperCase();

    }

}


/* ==========================================
   AUTH STARTUP
========================================== */

document.addEventListener("DOMContentLoaded", () => {

    initializeAuth();

});


/* ==========================================
   VERSION
========================================== */

console.log(

    "Cipher Authentication Module Loaded."

);
