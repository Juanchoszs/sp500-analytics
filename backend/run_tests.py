import sys
from app.tests.test_intelligence import test_intelligence_engine_calculation
from app.tests.test_docx_generator import test_generate_docx_with_dict_and_object

if __name__ == "__main__":
    try:
        print("Running Market Intelligence calculations test...")
        test_intelligence_engine_calculation()
        print("SUCCESS: Market Intelligence test passed perfectly!")

        print("Running docx generator robustness tests...")
        test_generate_docx_with_dict_and_object()
        print("SUCCESS: Docx generator tests passed!")

        sys.exit(0)
    except Exception as e:
        import traceback
        traceback.print_exc()
        print("FAILURE: Tests failed.")
        sys.exit(1)
