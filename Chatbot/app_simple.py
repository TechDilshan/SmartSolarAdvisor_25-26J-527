import streamlit as st
import sys
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler

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
        color: black;
    }
    .user-message {
        background-color: #E3F2FD;
        border-left: 5px solid #2196F3;
    }
    .assistant-message {
        background-color: #FFF3E0;
        border-left: 5px solid #FF9800;
    }
    .stats-box {
        background-color: #E8F5E9;
        padding: 1rem;
        border-radius: 0.5rem;
        margin: 0.5rem 0;
        color: black;
    }
</style>
""", unsafe_allow_html=True)

def is_solar_related(text: str, query: str) -> bool:
    """Check if the text is actually related to solar energy"""
    solar_keywords = [
        'solar', 'panel', 'photovoltaic', 'pv', 'energy', 'electricity',
        'renewable', 'inverter', 'battery', 'grid', 'metering', 'ceb',
        'sun', 'irradiance', 'monocrystalline', 'polycrystalline', 
        'efficiency', 'watt', 'kw', 'installation', 'system'
    ]
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    has_solar_content = any(keyword in text_lower for keyword in solar_keywords)
    query_is_solar = any(keyword in query_lower for keyword in solar_keywords)
    
    return has_solar_content and query_is_solar

def generate_answer(query: str, embeddings_handler):
    """Generate answer from search results"""
    results = embeddings_handler.search(query, n_results=5)
    
    documents = results.get('documents', [[]])[0]
    metadatas = results.get('metadatas', [[]])[0]
    
    if not documents:
        return {
            "answer": "❌ I don't have any information to answer that question.",
            "sources": [],
            "chunks_used": 0
        }
    
    # Filter solar-related documents
    solar_docs = []
    solar_meta = []
    
    for doc, meta in zip(documents, metadatas):
        if is_solar_related(doc, query):
            solar_docs.append(doc)
            solar_meta.append(meta)
    
    if not solar_docs:
        return {
            "answer": "❌ I don't have relevant solar energy information to answer that question. Please ask about solar panels, solar energy benefits, installation costs, or CEB net metering.",
            "sources": [],
            "chunks_used": 0
        }
    
    # Use top 3 chunks
    answer_parts = []
    sources = []
    
    for doc, meta in zip(solar_docs[:3], solar_meta[:3]):
        sections = doc.split('\n\n')
        query_words = set(query.lower().split())
        
        best_section = doc
        max_overlap = 0
        
        for section in sections:
            if len(section.strip()) < 50:
                continue
            section_words = set(section.lower().split())
            overlap = len(query_words & section_words)
            if overlap > max_overlap:
                max_overlap = overlap
                best_section = section
        
        if best_section.strip():
            answer_parts.append(best_section.strip())
        
        source_info = {
            "filename": meta.get('filename', 'Unknown'),
            "source_type": meta.get('source_type', 'Unknown')
        }
        if 'page_number' in meta:
            source_info['page'] = meta['page_number']
        
        sources.append(source_info)
    
    final_answer = "\n\n".join(answer_parts)
    
    return {
        "answer": final_answer,
        "sources": sources,
        "chunks_used": len(answer_parts)
    }

# Initialize session state
if 'messages' not in st.session_state:
    st.session_state.messages = []

if 'system_ready' not in st.session_state:
    st.session_state.system_ready = False

if 'embeddings_handler' not in st.session_state:
    with st.spinner("🔄 Initializing Solar Advisor System..."):
        try:
            config = Config()
            st.session_state.embeddings_handler = EmbeddingsHandler(
                model_name=config.EMBEDDING_MODEL,
                db_path=str(config.VECTORDB_DIR)
            )
            st.session_state.system_ready = True
        except Exception as e:
            st.error(f"Error initializing system: {str(e)}")
            st.session_state.system_ready = False

# Header
st.markdown('<h1 class="main-header">🌞 Smart Solar Advisor</h1>', unsafe_allow_html=True)
st.markdown('<p class="sub-header">Your Solar Energy Consultant for Sri Lanka | සූර්ය බලශක්ති උපදේශකයා</p>', unsafe_allow_html=True)

# Sidebar
with st.sidebar:
    st.header("ℹ️ System Information")
    
    if st.session_state.system_ready:
        try:
            info = st.session_state.embeddings_handler.get_collection_info()
            
            st.markdown(f"""
            <div class="stats-box">
            <b>Status:</b> ✅ Ready<br>
            <b>Knowledge Base:</b> {info['total_chunks']} chunks<br>
            <b>Embedding Model:</b> {info['model']}<br>
            <b>Mode:</b> Direct Search (No LLM)
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.error(f"Error getting system info: {str(e)}")
    else:
        st.warning("System not ready")
    
    st.markdown("---")
    
    st.header("🎯 Quick Questions")
    
    sample_questions = [
        "What are the benefits of solar energy?",
        "How much does a solar panel system cost?",
        "What is net metering?",
        "Tell me about monocrystalline vs polycrystalline panels",
        "What solar services are available?",
    ]
    
    for idx, question in enumerate(sample_questions):
        if st.button(question, key=f"sample_{idx}"):
            st.session_state.sample_question = question
    
    st.markdown("---")
    
    # Settings
    st.header("⚙️ Settings")
    
    if 'show_sources' not in st.session_state:
        st.session_state.show_sources = True
    
    st.session_state.show_sources = st.checkbox("Show Sources", value=st.session_state.show_sources)
    
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
        if st.session_state.show_sources and 'sources' in message and message['sources']:
            with st.expander("📚 Sources"):
                for i, source in enumerate(message['sources'], 1):
                    source_text = f"{i}. **{source['filename']}** ({source['source_type']})"
                    if 'page' in source:
                        source_text += f" - Page {source['page']}"
                    st.markdown(source_text)

# Handle sample question
user_input = None
if 'sample_question' in st.session_state:
    user_input = st.session_state.sample_question
    del st.session_state.sample_question

# Chat input
if prompt := st.chat_input("Ask me anything about solar energy..."):
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
        with st.spinner("🔍 Searching knowledge base..."):
            try:
                response = generate_answer(user_input, st.session_state.embeddings_handler)
                
                # Add assistant message
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response['answer'],
                    "sources": response['sources'],
                    "chunks_used": response['chunks_used'],
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
    <p>🌱 Powered by Vector Search | Built for Sri Lankan Solar Industry</p>
    <p>💡 Ask questions about solar energy</p>
</div>
""", unsafe_allow_html=True)