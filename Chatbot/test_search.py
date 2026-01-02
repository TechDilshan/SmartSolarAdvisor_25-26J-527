import sys
from pathlib import Path

sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from embeddings.embeddings_handler import EmbeddingsHandler

def is_solar_related(text: str, query: str) -> bool:
    """Check if the text is actually related to solar energy"""
    solar_keywords = [
        'solar', 'panel', 'photovoltaic', 'pv', 'energy', 'electricity',
        'renewable', 'inverter', 'battery', 'grid', 'metering', 'ceb',
        'sun', 'irradiance', 'monocrystalline', 'polycrystalline', 
        'efficiency', 'watt', 'kw', 'installation', 'system'
    ]
    
    # Check if text or query contains solar-related keywords
    text_lower = text.lower()
    query_lower = query.lower()
    
    # Check if the retrieved content has solar keywords
    has_solar_content = any(keyword in text_lower for keyword in solar_keywords)
    
    # Check if query is about solar
    query_is_solar = any(keyword in query_lower for keyword in solar_keywords)
    
    return has_solar_content and query_is_solar

def extract_answer(text: str, query: str) -> str:
    """Extract the most relevant part of the text as an answer"""
    # Split into sections
    sections = text.split('\n\n')
    
    # Find the section most relevant to the query
    query_words = set(query.lower().split())
    
    best_section = text
    max_overlap = 0
    
    for section in sections:
        if len(section.strip()) < 50:  # Skip very short sections
            continue
        section_words = set(section.lower().split())
        overlap = len(query_words & section_words)
        if overlap > max_overlap:
            max_overlap = overlap
            best_section = section
    
    return best_section.strip()

def main():
    """Test search functionality with simple answer generation"""
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
        results = embeddings_handler.search(query, n_results=5)
        
        # Check if we have results
        distances = results.get('distances', [[]])[0]
        documents = results.get('documents', [[]])[0]
        
        if not distances or not documents:
            print("\n❌ I don't have any information to answer that question.")
            print("Please ask questions related to solar energy, solar panels, or renewable energy.\n")
            print("-" * 60 + "\n")
            continue
        
        # Debug: Show distances
        print(f"\n[Debug] Distance range: {min(distances):.4f} to {max(distances):.4f}")
        
        # Use relative threshold - compare to best result
        # If best result is solar-related, use it regardless of absolute distance
        best_distance = distances[0]
        
        # Find first solar-related result
        found_answer = False
        for i, (doc, distance) in enumerate(zip(documents, distances)):
            # Use relative distance: accept if it's the best or within 20% of best
            is_close_enough = (distance <= best_distance * 1.2)
            
            if is_close_enough and is_solar_related(doc, query):
                # Found a relevant solar answer
                print(f"\n💡 Answer:\n")
                answer = extract_answer(doc, query)
                print(f"{answer}\n")
                
                # Show source
                metadata = results['metadatas'][0][i]
                print(f"\n📄 Source: {metadata.get('filename', 'N/A')}")
                if 'page_number' in metadata:
                    print(f"📖 Page: {metadata['page_number']}")
                
                # Show confidence based on relative position
                if i == 0:
                    confidence = "Very High (Top Match)"
                elif i == 1:
                    confidence = "High (2nd Match)"
                else:
                    confidence = "Medium (3rd+ Match)"
                print(f"🎯 Confidence: {confidence}")
                print(f"📊 Distance: {distance:.4f}")
                
                # Show additional related chunks
                print(f"\n📚 Additional Information:\n")
                shown_count = 0
                for j, (other_doc, other_dist) in enumerate(zip(documents, distances)):
                    if j != i and is_solar_related(other_doc, query):
                        if shown_count >= 2:  # Limit to 2 additional chunks
                            break
                        print(f"• {other_doc[:150]}...")
                        other_metadata = results['metadatas'][0][j]
                        print(f"  📄 Source: {other_metadata.get('filename', 'N/A')}\n")
                        shown_count += 1
                
                found_answer = True
                break
        
        if not found_answer:
            print("\n❌ I don't have enough relevant information about that topic.")
            print("I can only answer questions about:")
            print("  • Solar panel types and efficiency")
            print("  • Solar energy benefits")
            print("  • Solar installation and pricing in Sri Lanka")
            print("  • CEB net metering programs")
            print("  • Solar system components (inverters, batteries, etc.)\n")
        
        print("-" * 60 + "\n")

if __name__ == "__main__":
    main()