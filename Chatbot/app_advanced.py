import streamlit as st
import sys
from pathlib import Path
import json
from datetime import datetime
import speech_recognition as sr
from gtts import gTTS
import tempfile
import os

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from rag.rag_system import SolarRAGSystem

# Page configuration
st.set_page_config(
    page_title="Smart Solar Advisor Pro",
    page_icon="🌞",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'rag_system' not in st.session_state:
    with st.spinner("🔄 Initializing Solar Advisor System..."):
        try:
            config = Config()
            st.session_state.rag_system = SolarRAGSystem(config)
            st.session_state.system_ready = True
        except Exception as e:
            st.error(f"Error initializing system: {str(e)}")
            st.session_state.system_ready = False

if 'voice_enabled' not in st.session_state:
    st.session_state.voice_enabled = False

# Voice functions
def speech_to_text():
    """Convert speech to text"""
    recognizer = sr.Recognizer()
    
    try:
        with sr.Microphone() as source:
            st.info("🎤 Listening... Speak now!")
            recognizer.adjust_for_ambient_noise(source, duration=1)
            audio = recognizer.listen(source, timeout=10)
            
            # Try English first
            try:
                text = recognizer.recognize_google(audio, language='en-US')
                return text, "English"
            except:
                # Try Sinhala
                try:
                    text = recognizer.recognize_google(audio, language='si-LK')
                    return text, "Sinhala"
                except:
                    return None, None
    except Exception as e:
        st.error(f"Error: {str(e)}")
        return None, None

def text_to_speech(text, language="English"):
    """Convert text to speech"""
    try:
        lang_code = "si" if language == "Sinhala" else "en"
        tts = gTTS(text=text, lang=lang_code, slow=False)
        
        # Save to temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.mp3') as fp:
            tts.save(fp.name)
            return fp.name
    except Exception as e:
        st.error(f"Error generating speech: {str(e)}")
        return None

# Header with tabs
st.title("🌞 Smart Solar Advisor Pro")
st.markdown("*Your AI-powered solar energy consultant with voice support*")

# Create tabs
tab1, tab2, tab3 = st.tabs(["💬 Chat", "🎤 Voice Chat", "📊 Analytics"])

with tab1:
    # Text-based chat (same as app.py)
    st.header("Text Chat")
    
    # Display messages
    for message in st.session_state.messages:
        with st.chat_message(message['role']):
            st.markdown(message['content'])
            
            if message['role'] == 'assistant' and 'sources' in message:
                with st.expander("📚 Sources"):
                    for i, source in enumerate(message['sources'], 1):
                        st.write(f"{i}. {source['filename']} ({source['source_type']})")
    
    # Chat input
    if prompt := st.chat_input("Ask about solar energy..."):
        if st.session_state.system_ready:
            st.session_state.messages.append({
                "role": "user",
                "content": prompt
            })
            
            with st.spinner("Thinking..."):
                response = st.session_state.rag_system.generate_response(prompt)
                
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response['answer'],
                    "sources": response['sources'],
                    "language": response['language']
                })
            
            st.rerun()

with tab2:
    # Voice chat
    st.header("🎤 Voice Chat")
    st.markdown("Speak your question in English or Sinhala")
    
    col1, col2 = st.columns([1, 1])
    
    with col1:
        if st.button("🎤 Start Recording", type="primary"):
            text, language = speech_to_text()
            
            if text:
                st.success(f"Recognized ({language}): {text}")
                
                # Process the question
                with st.spinner("Processing..."):
                    response = st.session_state.rag_system.generate_response(text)
                    
                    # Display response
                    st.markdown("### Response:")
                    st.write(response['answer'])
                    
                    # Generate speech
                    audio_file = text_to_speech(response['answer'], response['language'])
                    
                    if audio_file:
                        # Play audio
                        with open(audio_file, 'rb') as audio:
                            st.audio(audio.read(), format='audio/mp3')
                        
                        # Clean up
                        os.unlink(audio_file)
                    
                    # Show sources
                    with st.expander("📚 Sources"):
                        for source in response['sources']:
                            st.write(f"- {source['filename']}")
            else:
                st.error("Could not recognize speech. Please try again.")
    
    with col2:
        st.info("""
        **Voice Chat Instructions:**
        
        1. Click the microphone button
        2. Speak clearly in English or Sinhala
        3. Wait for the response
        4. Listen to the audio response
        
        **Example Questions:**
        - "What are solar panel costs?"
        - "සූර්ය පැනල මිල කීයද?"
        """)

with tab3:
    # Analytics
    st.header("📊 Chat Analytics")
    
    if st.session_state.messages:
        # Message statistics
        col1, col2, col3 = st.columns(3)
        
        with col1:
            total_msgs = len(st.session_state.messages)
            st.metric("Total Messages", total_msgs)
        
        with col2:
            user_msgs = len([m for m in st.session_state.messages if m['role'] == 'user'])
            st.metric("Questions Asked", user_msgs)
        
        with col3:
            assistant_msgs = len([m for m in st.session_state.messages if m['role'] == 'assistant'])
            st.metric("Responses Given", assistant_msgs)
        
        # Language distribution
        st.subheader("Language Distribution")
        languages = [m.get('language', 'Unknown') for m in st.session_state.messages if m['role'] == 'assistant']
        if languages:
            lang_counts = {lang: languages.count(lang) for lang in set(languages)}
            st.bar_chart(lang_counts)
        
        # Recent conversations
        st.subheader("Recent Conversations")
        for i, msg in enumerate(reversed(st.session_state.messages[-10:])):
            with st.expander(f"{msg['role'].title()}: {msg['content'][:50]}..."):
                st.write(msg['content'])
                if 'timestamp' in msg:
                    st.caption(f"Time: {msg['timestamp']}")
    else:
        st.info("No conversations yet. Start chatting to see analytics!")

# Sidebar
with st.sidebar:
    st.header("⚙️ Settings")
    
    if st.session_state.system_ready:
        system_info = st.session_state.rag_system.get_system_info()
        st.json(system_info)
    
    st.markdown("---")
    
    if st.button("🗑️ Clear All Chats"):
        st.session_state.messages = []
        st.rerun()
    
    st.markdown("---")
    st.caption("© 2024 Smart Solar Advisor")