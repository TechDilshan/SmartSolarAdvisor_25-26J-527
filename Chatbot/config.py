"""Configuration settings for the Smart Solar Advisor Chatbot"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Main configuration class"""
    
    # Base directories
    BASE_DIR = Path(__file__).parent
    DATA_DIR = BASE_DIR / "data"
    SRC_DIR = BASE_DIR / "src"
    
    # Data source directories
    PDF_DIR = DATA_DIR / "pdfs"
    WEBSITE_DIR = DATA_DIR / "websites"
    DATASET_DIR = DATA_DIR / "datasets"
    
    # Processed data directories
    PROCESSED_DIR = DATA_DIR / "processed"
    CHUNKS_DIR = PROCESSED_DIR / "chunks"
    METADATA_DIR = PROCESSED_DIR / "metadata"
    
    # Vector database
    VECTORDB_DIR = BASE_DIR / "vectordb"
    VECTORDB_TYPE = os.getenv("VECTORDB_TYPE", "chromadb")
    
    # Model settings
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-3.5-turbo")
    EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "paraphrase-multilingual-MiniLM-L12-v2")
    
    # Retrieval settings
    TOP_K_RESULTS = int(os.getenv("TOP_K_RESULTS", 3))
    CHUNK_SIZE = int(os.getenv("CHUNK_SIZE", 1000))
    CHUNK_OVERLAP = int(os.getenv("CHUNK_OVERLAP", 200))
    
    # Content filtering settings
    ENABLE_SOLAR_FILTERING = os.getenv("ENABLE_SOLAR_FILTERING", "True").lower() == "true"
    MIN_RELEVANCE_SCORE = float(os.getenv("MIN_RELEVANCE_SCORE", 0.3))
    
    # Chunking parameters
    SEPARATORS = ["\n\n", "\n", ".", "!", "?", ",", " ", ""]
    
    # Supported file types
    SUPPORTED_PDF_EXTENSIONS = [".pdf"]
    SUPPORTED_DATASET_EXTENSIONS = [".csv", ".json", ".xlsx"]
    SUPPORTED_WEB_EXTENSIONS = [".html", ".txt"]
    
    # Application settings
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO")
    
    def __init__(self):
        """Initialize configuration and create directories"""
        self._create_directories()
        self._validate_config()
    
    def _create_directories(self):
        """Create required directories if they don't exist"""
        directories = [
            self.DATA_DIR,
            self.PDF_DIR,
            self.WEBSITE_DIR,
            self.DATASET_DIR,
            self.PROCESSED_DIR,
            self.CHUNKS_DIR,
            self.METADATA_DIR,
            self.VECTORDB_DIR,
        ]
        
        for directory in directories:
            directory.mkdir(parents=True, exist_ok=True)
    
    def _validate_config(self):
        """Validate configuration settings"""
        if not self.OPENAI_API_KEY or self.OPENAI_API_KEY == "your_openai_api_key_here":
            print("⚠️  Warning: OPENAI_API_KEY not set in .env file")
            print("   You'll need to add your API key before using the chatbot")
    
    def get_summary(self):
        """Get configuration summary"""
        return {
            "base_dir": str(self.BASE_DIR),
            "data_sources": {
                "pdfs": str(self.PDF_DIR),
                "websites": str(self.WEBSITE_DIR),
                "datasets": str(self.DATASET_DIR),
            },
            "models": {
                "llm": self.LLM_MODEL,
                "embedding": self.EMBEDDING_MODEL,
            },
            "retrieval": {
                "top_k": self.TOP_K_RESULTS,
                "chunk_size": self.CHUNK_SIZE,
                "chunk_overlap": self.CHUNK_OVERLAP,
            },
        }


# Create a global config instance
config = Config()

if __name__ == "__main__":
    # Print configuration when run directly
    import json
    print("Smart Solar Advisor Configuration")
    print("=" * 50)
    print(json.dumps(config.get_summary(), indent=2))
