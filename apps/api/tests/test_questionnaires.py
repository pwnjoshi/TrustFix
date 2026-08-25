from app.questionnaires import QuestionnaireError, export_csv, parse_csv
from app.models import Review


def test_csv_detection_preserves_rows():
    questions, headers = parse_csv(b"ID,Security Question,Owner\nA1,Is storage private?,Security\nA2,Is SSH restricted?,IT\n")
    assert headers[1] == "Security Question"
    assert [q.original_row for q in questions] == [2, 3]
    assert questions[0].question == "Is storage private?"


def test_csv_requires_a_question_column():
    try:
        parse_csv(b"ID,Owner\nA1,Security\n")
    except QuestionnaireError as exc:
        assert "question column" in str(exc)
    else:
        raise AssertionError("expected QuestionnaireError")


def test_export_preserves_question_order():
    questions, _ = parse_csv(b"Question\nSecond row\nThird row\n")
    review = Review(workspace_id="w", name="Review", questions=list(reversed(questions)))
    result = export_csv(review).decode("utf-8-sig")
    assert result.index("Second row") < result.index("Third row")

