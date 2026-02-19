import streamlit as st
import sys
from pathlib import Path
import json
from datetime import datetime

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from rag.rag_system import SolarRAGSystem

# Page configuration
st.set_page_config(
    page_title="Smart Solar Advisor",
    page_icon="🌞",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS
st.markdown("""
<style>
    .main-header {
        font-size: 3rem;
        color: #FF6B35;
        text-align: center;
        margin-bottom: 1rem;
    }
    .sub-header {
        font-size: 1.2rem;
        color: #4A4A4A;
        text-align: center;
        margin-bottom: 2rem;
    }
    .chat-message {
        padding: 1.5rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
        display: flex;
        flex-direction: column;
    }
    .user-message {
        background-color: #E3F2FD;
        border-left: 5px solid #2196F3;
    }
    .assistant-message {
        background-color: #FFF3E0;
        border-left: 5px solid #FF9800;
    }
    .source-box {
        background-color: #F5F5F5;
        padding: 1rem;
        border-radius: 0.3rem;
        margin-top: 0.5rem;
        font-size: 0.9rem;
    }
    .stats-box {
        background-color: #E8F5E9;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state - DO THIS FIRST
if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'system_ready' not in st.session_state:
    st.session_state.system_ready = False

if 'rag_system' not in st.session_state:
    with st.spinner("🔄 Initializing Solar Advisor System..."):
        try:
            config = Config()
            st.session_state.rag_system = SolarRAGSystem(config)
            st.session_state.system_ready = True
        except Exception as e:
            st.error(f"Error initializing system: {str(e)}")
            st.session_state.system_ready = False

# Header
st.markdown('<h1 class="main-header">🌞 Smart Solar Advisor</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Your AI-powered solar energy consultant for Sri Lanka | සූර්ය බලශක්ති උපදේශකයා</p>', unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.header("ℹ️ System Information")
    
    if st.session_state.system_ready:
        try:
            system_info = st.session_state.rag_system.get_system_info()
            
            st.markdown(f"""
            <div class="stats-box">
            <b>Status:</b> {system_info['status']}<br>
            <b>Knowledge Base:</b> {system_info['vector_db_chunks']} chunks<br>
            <b>Embedding Model:</b> {system_info['embedding_model']}<br>
            <b>LLM Model:</b> {system_info['llm_model']}
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.error(f"Error getting system info: {str(e)}")
    else:
        st.warning("System not ready")
    
    st.markdown("---")
    
    st.header("🎯 Quick Questions")
    
    sample_questions = {
        "English": [
            "What are the benefits of solar energy in Sri Lanka?",
            "How much does a solar panel system cost?",
            "What government incentives are available for solar?",
            "How do I maintain solar panels?",
            "What is the ROI of solar installation?"
        ],
        "Sinhala": [
            "ශ්‍රී ලංකාවේ සූර්ය බලශක්තියේ ප්‍රතිලාභ මොනවාද?",
            "සූර්ය පැනල පද්ධතියක මිල කීයද?",
            "සූර්ය බලශක්තිය සඳහා රජයේ දිරි දීමනා මොනවාද?",
            "සූර්ය පැනල නඩත්තු කරන්නේ කෙසේද?"
        ]
    }
    
    language_tab = st.radio("Select Language:", ["English", "Sinhala"])
    
    for idx, question in enumerate(sample_questions[language_tab]):
        if st.button(question, key=f"sample_{language_tab}_{idx}"):
            st.session_state.sample_question = question
    
    st.markdown("---")
    
    # Settings
    st.header("⚙️ Settings")
    
    if 'show_sources' not in st.session_state:
        st.session_state.show_sources = True
    if 'show_context' not in st.session_state:
        st.session_state.show_context = False
    
    st.session_state.show_sources = st.checkbox("Show Sources", value=st.session_state.show_sources)
    st.session_state.show_context = st.checkbox("Show Retrieved Context", value=st.session_state.show_context)
    
    if st.button("🗑️ Clear Chat History"):
        st.session_state.messages = []
        st.rerun()
    
    st.markdown("---")
    
    # Statistics
    st.header("📊 Session Statistics")
    st.metric("Total Messages", len(st.session_state.messages))
    
    if st.session_state.messages:
        user_msgs = len([m for m in st.session_state.messages if m['role'] == 'user'])
        st.metric("Questions Asked", user_msgs)

# Main chat interface
st.markdown("### 💬 Chat")

# Display chat messages
for message in st.session_state.messages:
    if message['role'] == 'user':
        st.markdown(f"""
        <div class="chat-message user-message">
            <b>👤 You:</b><br>
            {message['content']}
        </div>
        """, unsafe_allow_html=True)
    else:
        st.markdown(f"""
        <div class="chat-message assistant-message">
            <b>🤖 Solar Advisor:</b><br>
            {message['content']}
        </div>
        """, unsafe_allow_html=True)
        
        # Show sources if enabled
        if st.session_state.show_sources and 'sources' in message:
            with st.expander("📚 Sources"):
                for i, source in enumerate(message['sources'], 1):
                    source_text = f"{i}. **{source['filename']}** ({source['source_type']})"
                    if 'page' in source:
                        source_text += f" - Page {source['page']}"
                    st.markdown(source_text)
        
        # Show context if enabled
        if st.session_state.show_context and 'raw_context' in message:
            with st.expander("🔍 Retrieved Context"):
                st.text(message['raw_context'][:1000] + "..." if len(message['raw_context']) > 1000 else message['raw_context'])

# Handle sample question
user_input = None
if 'sample_question' in st.session_state:
    user_input = st.session_state.sample_question
    del st.session_state.sample_question

# Chat input
if prompt := st.chat_input("Ask me anything about solar energy... | සූර්ය බලශක්තිය ගැන මගෙන් ඕනෑම දෙයක් අසන්න..."):
    user_input = prompt

# Process user input
if user_input:
    if not st.session_state.system_ready:
        st.error("⚠️ System not ready. Please check the initialization errors.")
    else:
        # Add user message
        st.session_state.messages.append({
            "role": "user",
            "content": user_input,
            "timestamp": datetime.now().isoformat()
        })
        
        # Generate response
        with st.spinner("🤔 Thinking..."):
            try:
                response = st.session_state.rag_system.generate_response(user_input)
                
                # Add assistant message
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response['answer'],
                    "language": response['language'],
                    "sources": response['sources'],
                    "context_used": response['context_used'],
                    "raw_context": response['raw_context'],
                    "timestamp": datetime.now().isoformat()
                })
                
            except Exception as e:
                st.error(f"Error generating response: {str(e)}")
                import traceback
                st.code(traceback.format_exc())
        
        # Rerun to show new messages
        st.rerun()

# Footer
st.markdown("---")
st.markdown("""
<div style="text-align: center; color: #888; font-size: 0.9rem;">
    <p>🌱 Powered by AI | Built for Sri Lankan Solar Industry</p>
    <p>💡 Ask questions in English or Sinhala | ඉංග්‍රීසි හෝ සිංහලෙන් ප්‍රශ්න අසන්න</p>
</div>
""", unsafe_allow_html=True)