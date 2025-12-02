import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler

def main():
    """Test search functionality"""
    config = Config()
    
    # Initialize embeddings handler
    embeddings_handler = EmbeddingsHandler(
        model_name=config.EMBEDDING_MODEL,
        db_path=str(config.VECTORDB_DIR)
    )
    
    # Get collection info
    info = embeddings_handler.get_collection_info()
    print(f"\nVector Database Info:")
    print(f"  Collection: {info['collection_name']}")
    print(f"  Total chunks: {info['total_chunks']}")
    print(f"  Model: {info['model']}")
    
    # Interactive search
    print("\n" + "=" * 60)
    print("Solar Knowledge Search")
    print("=" * 60)
    print("Enter your questions (or 'quit' to exit)\n")
    
    while True:
        query = input("Question: ").strip()
        
        if query.lower() in ['quit', 'exit', 'q']:
            break
        
        if not query:
            continue
        
        # Search
        results = embeddings_handler.search(query, n_results=3)
        
        print(f"\n📚 Top 3 Results:\n")
        for i, doc in enumerate(results['documents'][0], 1):
            print(f"{i}. {doc[:300]}...")
            metadata = results['metadatas'][0][i-1]
            print(f"   📄 Source: {metadata.get('filename', 'N/A')}")
            if 'page_number' in metadata:
                print(f"   📖 Page: {metadata['page_number']}")
            print()
        
        print("-" * 60 + "\n")

if __name__ == "__main__":
    main()