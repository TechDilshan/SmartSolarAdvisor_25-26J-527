import streamlit as st
import sys
from pathlib import Path
from datetime import datetime

# Add src to path
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler
from utils.translator import LanguageTranslator

# Page configuration
st.set_page_config(
    page_title="Smart Solar Advisor",
    page_icon="🌞",
    layout="wide",
    initial_sidebar_state="expanded"
)

# Custom CSS (keep existing CSS)
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
    .language-badge {
        display: inline-block;
        padding: 0.3rem 0.6rem;
        border-radius: 0.3rem;
        font-size: 0.8rem;
        margin-bottom: 0.5rem;
    }
    .sinhala-badge {
        background-color: #4CAF50;
        color: white;
    }
    .english-badge {
        background-color: #2196F3;
        color: white;
    }
</style>
""", unsafe_allow_html=True)

def is_solar_related(text: str, query: str) -> bool:
    """Check if the text is actually related to solar energy - improved version"""
    solar_keywords = [
        'solar', 'panel', 'photovoltaic', 'pv', 'energy', 'electricity',
        'renewable', 'inverter', 'battery', 'grid', 'metering', 'ceb',
        'sun', 'irradiance', 'monocrystalline', 'polycrystalline', 
        'efficiency', 'watt', 'kw', 'installation', 'system', 'power',
        'benefit', 'advantage', 'cost', 'price', 'saving', 'rooftop',
        'electric', 'utility', 'subsidy', 'incentive', 'feed-in'
    ]
    
    text_lower = text.lower()
    query_lower = query.lower()
    
    # Check if the retrieved content has solar keywords
    has_solar_content = any(keyword in text_lower for keyword in solar_keywords)
    
    # For queries, be more lenient - check if query OR translation contains solar keywords
    query_is_solar = any(keyword in query_lower for keyword in solar_keywords)
    
    # Also check if it's a general energy/benefits question
    general_energy_terms = ['benefit', 'advantage', 'cost', 'price', 'save', 'install']
    is_general_energy_query = any(term in query_lower for term in general_energy_terms)
    
    # If it's a general energy query and content has solar keywords, accept it
    if is_general_energy_query and has_solar_content:
        return True
    
    return has_solar_content and (query_is_solar or is_general_energy_query)

def generate_answer(query: str, embeddings_handler, translator):
    """Generate answer with translation support - improved version"""
    # Detect query language
    query_language = translator.detect_language(query)
    original_query = query
    translated_query = None
    
    # If Sinhala, translate to English for search
    if query_language == 'sinhala':
        translated_query = translator.translate_to_english(query)
        query = translated_query
        
        # Debug: Show translation
        st.info(f"🔄 Translation: {original_query} → {translated_query}")
    
    # Search using English query
    results = embeddings_handler.search(query, n_results=5)
    
    documents = results.get('documents', [[]])[0]
    metadatas = results.get('metadatas', [[]])[0]
    distances = results.get('distances', [[]])[0]
    
    # Debug: Show distances
    if distances:
        st.info(f"📊 Top result distance: {distances[0]:.4f}")
    
    if not documents:
        no_answer = "❌ I don't have any information to answer that question."
        if query_language == 'sinhala':
            no_answer = translator.translate_to_sinhala(no_answer)
        return {
            "answer": no_answer,
            "sources": [],
            "chunks_used": 0,
            "language": query_language,
            "translated_query": translated_query
        }
    
    # Filter solar-related documents with more lenient matching
    solar_docs = []
    solar_meta = []
    
    for doc, meta in zip(documents, metadatas):
        # For Sinhala queries, be more lenient with matching
        if query_language == 'sinhala':
            # Check if document has any solar content at all
            if any(word in doc.lower() for word in ['solar', 'panel', 'energy', 'sun', 'renewable']):
                solar_docs.append(doc)
                solar_meta.append(meta)
        else:
            # For English queries, use stricter matching
            if is_solar_related(doc, query):
                solar_docs.append(doc)
                solar_meta.append(meta)
    
    if not solar_docs:
        # If no solar docs found, but we have results, still show something
        if documents and query_language == 'sinhala':
            # For Sinhala queries, be even more lenient - use top result anyway
            solar_docs = documents[:1]
            solar_meta = metadatas[:1]
        else:
            no_answer = "❌ I don't have relevant solar energy information to answer that question. Please ask about solar panels, solar energy benefits, installation costs, or CEB net metering."
            if query_language == 'sinhala':
                no_answer = translator.translate_to_sinhala(no_answer)
            return {
                "answer": no_answer,
                "sources": [],
                "chunks_used": 0,
                "language": query_language,
                "translated_query": translated_query
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
    
    # Combine answer (in English)
    final_answer = "\n\n".join(answer_parts)
    
    # Translate answer to Sinhala if query was in Sinhala
    if query_language == 'sinhala':
        st.info("🔄 Translating answer to Sinhala...")
        final_answer = translator.translate_to_sinhala(final_answer)
    
    return {
        "answer": final_answer,
        "sources": sources,
        "chunks_used": len(answer_parts),
        "language": query_language,
        "translated_query": translated_query
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
            st.session_state.translator = LanguageTranslator()
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
            <b>Mode:</b> Direct Search + Translation<br>
            <b>Languages:</b> English, සිංහල
            </div>
            """, unsafe_allow_html=True)
        except Exception as e:
            st.error(f"Error getting system info: {str(e)}")
    else:
        st.warning("System not ready")
    
    st.markdown("---")
    
    st.header("🎯 Quick Questions")
    
    # Tabbed interface for language selection
    tab1, tab2 = st.tabs(["English", "සිංහල"])
    
    with tab1:
        english_questions = [
            "What are the benefits of solar energy?",
            "How much does a solar panel system cost?",
            "What is net metering?",
            "Tell me about monocrystalline vs polycrystalline panels",
            "What solar services are available?",
        ]
        
        for idx, question in enumerate(english_questions):
            if st.button(question, key=f"sample_en_{idx}"):
                st.session_state.sample_question = question
    
    with tab2:
        sinhala_questions = [
            "සූර්ය බලශක්තියේ ප්‍රතිලාභ මොනවාද?",
            "සූර්ය පැනල පද්ධතියක මිල කීයද?",
            "නිකම් මීටරය යනු කුමක්ද?",
            "මොනොක්‍රිස්ටලයින් සහ පොලික්‍රිස්ටලයින් පැනල් ගැන කියන්න",
            "ලබා ගත හැකි සූර්ය සේවා මොනවාද?",
        ]
        
        for idx, question in enumerate(sinhala_questions):
            if st.button(question, key=f"sample_si_{idx}"):
                st.session_state.sample_question = question
    
    st.markdown("---")
    
    # Settings
    st.header("⚙️ Settings")
    
    if 'show_sources' not in st.session_state:
        st.session_state.show_sources = True
    
    if 'show_translation' not in st.session_state:
        st.session_state.show_translation = True
    
    if 'show_debug' not in st.session_state:
        st.session_state.show_debug = False
    
    st.session_state.show_sources = st.checkbox("Show Sources", value=st.session_state.show_sources)
    st.session_state.show_translation = st.checkbox("Show Translation", value=st.session_state.show_translation)
    st.session_state.show_debug = st.checkbox("Show Debug Info", value=st.session_state.show_debug)
    
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
        
        # Language breakdown
        sinhala_msgs = len([m for m in st.session_state.messages if m.get('language') == 'sinhala'])
        english_msgs = len([m for m in st.session_state.messages if m.get('language') == 'english'])
        
        col1, col2 = st.columns(2)
        with col1:
            st.metric("සිංහල", sinhala_msgs)
        with col2:
            st.metric("English", english_msgs)

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
        # Language badge
        lang_badge = "english-badge" if message.get('language') == 'english' else "sinhala-badge"
        lang_text = "English" if message.get('language') == 'english' else "සිංහල"
        
        st.markdown(f"""
        <div class="chat-message assistant-message">
            <span class="language-badge {lang_badge}">{lang_text}</span><br>
            <b>🤖 Solar Advisor:</b><br>
            {message['content']}
        </div>
        """, unsafe_allow_html=True)
        
        # Show translation info if enabled
        if st.session_state.show_translation and message.get('translated_query'):
            with st.expander("🔄 Translation Info"):
                st.info(f"**Original Query (සිංහල):** {message.get('original_query', 'N/A')}")
                st.info(f"**Translated Query (English):** {message['translated_query']}")
        
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
if prompt := st.chat_input("Ask me anything about solar energy... | සූර්ය බලශක්තිය ගැන ඕනෑම දෙයක් අසන්න..."):
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
        with st.spinner("🔍 Searching knowledge base... | දත්ත සමුදාය සොයමින්..."):
            try:
                response = generate_answer(
                    user_input, 
                    st.session_state.embeddings_handler,
                    st.session_state.translator
                )
                
                # Add assistant message
                st.session_state.messages.append({
                    "role": "assistant",
                    "content": response['answer'],
                    "sources": response['sources'],
                    "chunks_used": response['chunks_used'],
                    "language": response['language'],
                    "translated_query": response.get('translated_query'),
                    "original_query": user_input if response['language'] == 'sinhala' else None,
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
    <p>🌱 Powered by Vector Search + Translation | දෛශික සෙවුම + පරිවර්තනය මගින් බලගන්වයි</p>
    <p>💡 Ask questions in English or Sinhala | ඉංග්‍රීසි හෝ සිංහලෙන් ප්‍රශ්න අසන්න</p>
</div>
""", unsafe_allow_html=True)