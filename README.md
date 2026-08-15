FullForm
App link: https://fullformapp.vercel.app/

Contributors: Alex, Rithwik, Meet, Sanchit
FullForm is a web app that analyzes workout videos and gives users real-time feedback on their exercise form. Users upload a video of themselves performing an exercise (currently supporting squats and bicep curls), and the app uses pose estimation to detect body landmarks, calculate joint angles, and flag frames where form breaks down — overlaying warnings directly on the returned video along with a text summary of issues found.


Tech Stack

Frontend

React 19
Vite (build tool and dev server)
JavaScript (JSX)

Backend

Python 3
Flask (web framework)
Flask-CORS (cross-origin request handling)
Gunicorn (production WSGI server)

Computer Vision / AI

OpenCV (opencv-python-headless) — video frame reading/writing
MediaPipe — pose landmark detection
NumPy — angle calculations from joint coordinates

Hosting

Frontend + backend deployable as a single unified Flask app (Flask serves the built React static files), or as separate services depending on hosting provider.
How It Works
Upload — The user selects an exercise type (e.g. squats, bicep curls) and uploads a video through the React frontend.
Processing — The video is sent to the Flask backend via a POST /upload request. The backend reads the video frame-by-frame using OpenCV.
Pose Detection — Each frame is passed through MediaPipe's Pose model, which returns body landmark coordinates (joints like hips, knees, ankles, shoulders, elbows, wrists).
Form Analysis — Using the detected landmarks, the backend calculates relevant joint angles (e.g. knee angle for squats, elbow angle for bicep curls) with vector math. Frames where the angle falls outside a healthy range are flagged.
Feedback Overlay — Flagged frames get a warning label burned directly into the video (e.g. "WARNING: SQUAT DEEPER!"), and a deduplicated list of timestamped text warnings is generated.
Response — The processed video and warning list are returned to the frontend, where the user can watch the annotated video and review the feedback.
Project Structure
FullForm/
├── backend.py              # Flask app: upload/download routes, pose analysis logic
├── requirements.txt        # Python dependencies
├── uploads/                # Temporary storage for raw uploaded videos
├── processed/               # Temporary storage for annotated output videos
└── my-react-app/            # React (Vite) frontend
    ├── src/
    │   ├── components/      # UI components (e.g. navbar, upload form)
    │   └── utils/
    │       └── analyzeVideo.js
    ├── dist/                 # Production build output (generated)
    └── package.json
Running Locally

Backend

bash
pip install -r requirements.txt
python backend.py

Runs on http://localhost:5000 by default.

Frontend

bash
cd my-react-app
npm install
npm run dev

Runs on Vite's default dev server port, with API requests proxied or pointed at the local backend.

Supported Exercises
Exercise	Joint Angle Tracked	Feedback Trigger
Squats	Hip–Knee–Ankle	Insufficient depth
Bicep Curls	Shoulder–Elbow–Wrist	Incomplete rep (partial extension/flexion)

More exercises can be added by extending the process_video_file function in backend.py with new landmark combinations and angle thresholds.

Notes
Video processing runs synchronously per upload — larger videos take proportionally longer to analyze.
MediaPipe Pose currently tracks a single person per frame; multi-person videos are not supported.
If MediaPipe is unavailable in the runtime environment, the backend falls back to a no-op mode (returns the original video unmodified with no warnings) rather than failing outright.

Images:
<img width="942" height="488" alt="Screenshot 2026-08-15 185624" src="https://github.com/user-attachments/assets/705398ec-b9f1-44cd-84e5-dbf9a1ecce7e" />
