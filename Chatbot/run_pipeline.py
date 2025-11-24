"""
Run Pipeline - Execute the complete data processing pipeline
This is the main entry point for processing all data sources
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.append(str(Path(__file__).parent / "src"))

from config import Config
from src.ingestion.data_pipeline import DataPipeline


def main():
    """Run the data processing pipeline"""
    
    print("\n" + "=" * 70)
    print("  SMART SOLAR ADVISOR - DATA PROCESSING PIPELINE")
    print("=" * 70)
    
    # Initialize configuration
    print("\n📋 Initializing configuration...")
    config = Config()
    
    print(f"   Data directories:")
    print(f"   - PDFs:     {config.PDF_DIR}")
    print(f"   - Websites: {config.WEBSITE_DIR}")
    print(f"   - Datasets: {config.DATASET_DIR}")
    print(f"   Output: {config.PROCESSED_DIR}")
    print(f"\n   Filtering settings:")
    print(f"   - Solar filtering: {'ENABLED' if config.ENABLE_SOLAR_FILTERING else 'DISABLED'}")
    print(f"   - Min relevance score: {config.MIN_RELEVANCE_SCORE}")
    
    # Create and run pipeline
    print("\n🚀 Starting data processing pipeline...\n")
    pipeline = DataPipeline(
        config,
        enable_filtering=config.ENABLE_SOLAR_FILTERING,
        min_relevance_score=config.MIN_RELEVANCE_SCORE
    )
    
    try:
        documents = pipeline.run_full_pipeline()
        
        print("\n" + "=" * 70)
        print("  NEXT STEPS")
        print("=" * 70)
        print("\n✅ Data processing complete!")
        print(f"✅ {len(documents)} documents ready for embedding")
        print(f"\n📁 Output files:")
        print(f"   - All documents: {config.PROCESSED_DIR / 'all_documents.json'}")
        print(f"   - Summary: {config.PROCESSED_DIR / 'pipeline_summary.json'}")
        print(f"   - Metadata: {config.METADATA_DIR}")
        
        print(f"\n🎯 Next development steps:")
        print(f"   1. Create text chunking system")
        print(f"   2. Generate embeddings")
        print(f"   3. Store in vector database")
        print(f"   4. Build RAG system")
        print(f"   5. Add voice capabilities")
        print(f"   6. Create Streamlit UI")
        
        print("\n" + "=" * 70 + "\n")
        
        return 0
        
    except Exception as e:
        print(f"\n❌ Error running pipeline: {str(e)}")
        import traceback
        traceback.print_exc()
        return 1


if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
