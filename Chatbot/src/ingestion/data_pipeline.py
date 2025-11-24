"""
Data Pipeline - Main orchestrator for all data processing
Coordinates PDF, Web, and Dataset processors
"""

from pathlib import Path
from typing import List, Dict
import json
from datetime import datetime
import logging

from .pdf_processor import PDFProcessor
from .web_processor import WebProcessor
from .dataset_processor import DatasetProcessor

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DataPipeline:
    """Main orchestrator for all data processing"""
    
    def __init__(self, config, enable_filtering: bool = True, min_relevance_score: float = 0.3):
        """
        Initialize data pipeline
        
        Args:
            config: Configuration object with directory paths
            enable_filtering: Enable solar content filtering
            min_relevance_score: Minimum relevance score (0-1) to keep content
        """
        self.config = config
        self.enable_filtering = enable_filtering
        self.min_relevance_score = min_relevance_score
        
        # Initialize processors with filtering settings
        self.pdf_processor = PDFProcessor(
            config.PDF_DIR, 
            config.METADATA_DIR,
            enable_filtering=enable_filtering,
            min_score=min_relevance_score
        )
        self.web_processor = WebProcessor(
            config.WEBSITE_DIR,
            config.METADATA_DIR,
            enable_filtering=enable_filtering,
            min_score=min_relevance_score
        )
        self.dataset_processor = DatasetProcessor(
            config.DATASET_DIR,
            config.METADATA_DIR,
            enable_filtering=enable_filtering,
            min_score=min_relevance_score
        )
        
        self.all_documents = []
        self.statistics = {
            "pdf_count": 0,
            "website_count": 0,
            "dataset_count": 0,
            "total_documents": 0,
            "total_characters": 0
        }
    
    def run_full_pipeline(self) -> List[Dict]:
        """
        Run the complete data processing pipeline
        
        Returns:
            List of all processed documents
        """
        logger.info("=" * 70)
        logger.info("STARTING FULL DATA PROCESSING PIPELINE")
        logger.info("=" * 70)
        
        # Step 1: Process PDFs
        logger.info("\n[STEP 1/3] Processing PDF files...")
        logger.info("-" * 70)
        pdf_data = self.pdf_processor.process_all_pdfs()
        self._add_to_documents(pdf_data, "pdf")
        self.statistics["pdf_count"] = len(pdf_data)
        
        # Step 2: Process Websites
        logger.info("\n[STEP 2/3] Processing website files...")
        logger.info("-" * 70)
        web_data = self.web_processor.process_all_websites()
        self._add_to_documents(web_data, "website")
        self.statistics["website_count"] = len(web_data)
        
        # Step 3: Process Datasets
        logger.info("\n[STEP 3/3] Processing dataset files...")
        logger.info("-" * 70)
        dataset_data = self.dataset_processor.process_all_datasets()
        self._add_to_documents(dataset_data, "dataset")
        self.statistics["dataset_count"] = len(dataset_data)
        
        # Update statistics
        self.statistics["total_documents"] = len(self.all_documents)
        self.statistics["total_characters"] = sum(
            len(doc["text"]) for doc in self.all_documents
        )
        
        # Save all processed documents
        self._save_processed_documents()
        
        # Save pipeline summary
        self._save_pipeline_summary()
        
        # Print final summary
        self._print_summary()
        
        return self.all_documents
    
    def _add_to_documents(self, data_list: List[Dict], source_type: str):
        """
        Add processed data to document collection
        
        Args:
            data_list: List of processed documents
            source_type: Type of source (pdf, website, dataset)
        """
        for item in data_list:
            if source_type == "pdf":
                # PDFs have multiple pages
                for page in item["content"]:
                    self.all_documents.append({
                        "text": page["content"],
                        "metadata": {
                            **item["metadata"],
                            "page_number": page["page"]
                        }
                    })
            else:
                # Websites and datasets have single content
                self.all_documents.append({
                    "text": item["content"],
                    "metadata": item["metadata"]
                })
    
    def _save_processed_documents(self):
        """Save all processed documents to JSON file"""
        output_file = self.config.PROCESSED_DIR / "all_documents.json"
        
        # Create a serializable version (without DataFrame/raw_data objects)
        serializable_docs = []
        for doc in self.all_documents:
            serializable_docs.append({
                "text": doc["text"],
                "metadata": {
                    k: v for k, v in doc["metadata"].items()
                    if k not in ["dataframe", "raw_data"]
                }
            })
        
        data_to_save = {
            "processed_date": datetime.now().isoformat(),
            "total_documents": len(serializable_docs),
            "statistics": self.statistics,
            "documents": serializable_docs
        }
        
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(data_to_save, f, indent=2, ensure_ascii=False)
        
        logger.info(f"\n✓ Saved all documents to {output_file}")
    
    def _save_pipeline_summary(self):
        """Save pipeline execution summary"""
        summary_file = self.config.PROCESSED_DIR / "pipeline_summary.json"
        
        summary = {
            "execution_date": datetime.now().isoformat(),
            "statistics": self.statistics,
            "sources": {
                "pdfs": {
                    "count": self.statistics["pdf_count"],
                    "directory": str(self.config.PDF_DIR)
                },
                "websites": {
                    "count": self.statistics["website_count"],
                    "directory": str(self.config.WEBSITE_DIR)
                },
                "datasets": {
                    "count": self.statistics["dataset_count"],
                    "directory": str(self.config.DATASET_DIR)
                }
            },
            "output": {
                "total_documents": self.statistics["total_documents"],
                "total_characters": self.statistics["total_characters"],
                "output_directory": str(self.config.PROCESSED_DIR)
            }
        }
        
        with open(summary_file, 'w', encoding='utf-8') as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        logger.info(f"✓ Saved pipeline summary to {summary_file}")
    
    def _print_summary(self):
        """Print pipeline execution summary"""
        logger.info("\n" + "=" * 70)
        logger.info("PIPELINE EXECUTION COMPLETE")
        logger.info("=" * 70)
        logger.info(f"\n📊 Processing Statistics:")
        logger.info(f"   PDF Files:      {self.statistics['pdf_count']}")
        logger.info(f"   Website Files:  {self.statistics['website_count']}")
        logger.info(f"   Dataset Files:  {self.statistics['dataset_count']}")
        logger.info(f"   " + "-" * 50)
        logger.info(f"   Total Documents: {self.statistics['total_documents']}")
        logger.info(f"   Total Characters: {self.statistics['total_characters']:,}")
        logger.info("\n✅ All data processed successfully!")
        logger.info("=" * 70 + "\n")
    
    def get_documents(self) -> List[Dict]:
        """
        Get all processed documents
        
        Returns:
            List of processed documents
        """
        return self.all_documents
    
    def get_statistics(self) -> Dict:
        """
        Get processing statistics
        
        Returns:
            Dictionary of statistics
        """
        return self.statistics


if __name__ == "__main__":
    # Test the pipeline
    import sys
    from pathlib import Path
    
    # Add parent directory to path
    sys.path.append(str(Path(__file__).parent.parent.parent))
    
    from config import Config
    
    # Initialize and run pipeline
    config = Config()
    pipeline = DataPipeline(config)
    documents = pipeline.run_full_pipeline()
    
    print(f"\n✓ Pipeline test completed!")
    print(f"✓ Processed {len(documents)} documents")
