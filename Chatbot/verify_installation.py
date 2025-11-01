"""Verify that all required packages are installed correctly"""
import sys

def check_package(package_name, import_name=None):
    """Check if a package is installed"""
    if import_name is None:
        import_name = package_name
    
    try:
        __import__(import_name)
        print(f"✓ {package_name:30} - Installed")
        return True
    except ImportError:
        print(f"✗ {package_name:30} - NOT FOUND")
        return False

def main():
    """Run verification checks"""
    print("=" * 60)
    print("Smart Solar Advisor - Package Verification")
    print("=" * 60)
    print()
    
    packages = [
        # Core LangChain
        ("langchain", "langchain"),
        ("langchain-community", "langchain_community"),
        ("langchain-openai", "langchain_openai"),
        
        # Vector DB
        ("chromadb", "chromadb"),
        
        # ML/Embeddings
        ("sentence-transformers", "sentence_transformers"),
        
        # LLM APIs
        ("openai", "openai"),
        
        # Data processing
        ("PyPDF2", "PyPDF2"),
        ("beautifulsoup4", "bs4"),
        ("requests", "requests"),
        ("pandas", "pandas"),
        
        # UI
        ("streamlit", "streamlit"),
        
        # Voice
        ("SpeechRecognition", "speech_recognition"),
        ("gTTS", "gtts"),
        
        # Utilities
        ("python-dotenv", "dotenv"),
        ("langdetect", "langdetect"),
        ("tqdm", "tqdm"),
    ]
    
    results = []
    for package_name, import_name in packages:
        result = check_package(package_name, import_name)
        results.append(result)
    
    print()
    print("=" * 60)
    total = len(results)
    installed = sum(results)
    print(f"Summary: {installed}/{total} packages installed successfully")
    print("=" * 60)
    
    if installed == total:
        print()
        print("🎉 All packages are installed correctly!")
        print("You're ready to start developing the chatbot!")
    else:
        print()
        print("⚠️  Some packages are missing. Please install them using:")
        print("   pip install -r requirements.txt")
    
    return installed == total

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
